import { convertListToLinks, parseLink } from "@/linkUtils"
import {
  OCCURRENCE_DATE_FORMAT,
  OccurrenceObject,
  OccurrenceProperties,
} from "@/types"
import { App, TFile } from "obsidian"

/**
 * File operations for OccurrenceStore
 * Handles file processing, validation, and filename generation
 */
export class FileOperations {
  constructor(private app: App) {}

  /**
   * Check if a file is relevant to this store
   * @param filePath The file path to check
   */
  public isRelevantFile(filePath: string): boolean {
    return filePath.startsWith("Occurrences/") && filePath.endsWith(".md")
  }

  /**
   * Process a single file and return its parsed occurrence object
   * @param file The file to process
   * @returns The parsed occurrence object or null if file should be ignored
   */
  public async processFile(file: TFile): Promise<OccurrenceObject | null> {
    const fileCache = this.app.metadataCache.getFileCache(file)

    const frontmatter = fileCache?.frontmatter ?? {}
    const {
      occurrence_occurred_at,
      occurrence_to_process,
      occurrence_location,
      occurrence_participants,
      occurrence_intents,
      tags,
      ...otherProperties
    } = frontmatter

    // Build properties object with all frontmatter data
    const properties: OccurrenceProperties = {
      occurredAt: new Date(occurrence_occurred_at),
      toProcess:
        !occurrence_occurred_at ||
        isNaN(new Date(occurrence_occurred_at).getTime()) ||
        occurrence_to_process
          ? true
          : false,
      participants: convertListToLinks(occurrence_participants),
      intents: convertListToLinks(occurrence_intents),
      location: occurrence_location ? parseLink(occurrence_location) : null,
      tags: this.normalizeTags(tags),
      // Include ALL other frontmatter properties in the properties object
      ...otherProperties,
    }

    const occurrence: OccurrenceObject = {
      path: file.path,
      file,
      title: this.removeDatePrefix(file.basename, OCCURRENCE_DATE_FORMAT),
      class: "Occurrence",
      properties,
    }

    return occurrence
  }

  /**
   * Check if a file's frontmatter has changed in a way that affects our data model
   * @param file The file to check
   * @param cachedItem The currently cached item
   * @returns true if the frontmatter has relevant changes
   */
  public async hasRelevantChanges(
    file: TFile,
    cachedItem: OccurrenceObject
  ): Promise<boolean> {
    const fileCache = this.app.metadataCache.getFileCache(file)
    if (!fileCache || !fileCache.frontmatter) return false

    const frontmatter = fileCache.frontmatter
    const {
      occurrence_occurred_at,
      occurrence_to_process,
      occurrence_location,
      occurrence_participants,
      occurrence_intents,
      tags,
    } = frontmatter

    // Parse new values
    const newOccurredAt = new Date(occurrence_occurred_at)
    const newToProcess =
      !occurrence_occurred_at ||
      isNaN(newOccurredAt.getTime()) ||
      occurrence_to_process
        ? true
        : false
    const newParticipants = convertListToLinks(occurrence_participants)
    const newIntents = convertListToLinks(occurrence_intents)
    const newLocation = occurrence_location
      ? parseLink(occurrence_location)
      : null
    const newTags = this.normalizeTags(tags)

    // Check if core Occurrence properties changed
    if (
      cachedItem.properties.occurredAt.getTime() !== newOccurredAt.getTime() ||
      cachedItem.properties.toProcess !== newToProcess ||
      !this.linksArrayEqual(
        cachedItem.properties.participants,
        newParticipants
      ) ||
      !this.linksArrayEqual(cachedItem.properties.intents, newIntents) ||
      !this.linkEqual(cachedItem.properties.location, newLocation) ||
      !this.arraysEqual(cachedItem.properties.tags, newTags)
    ) {
      return true
    }

    // Compare all other frontmatter properties stored in properties
    for (const key of Object.keys(frontmatter)) {
      // Skip the ones we already checked above
      if (
        ![
          "occurrence_occurred_at",
          "occurrence_to_process",
          "occurrence_location",
          "occurrence_participants",
          "occurrence_intents",
          "tags",
        ].includes(key)
      ) {
        if (frontmatter[key] !== (cachedItem.properties as any)[key]) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Generate the expected filename (without extension) for a file based on its content
   * @param file The file to generate a filename for
   * @returns The expected filename or null if file should be ignored
   */
  public async generateFileName(file: TFile): Promise<string | null> {
    const fileCache = this.app.metadataCache.getFileCache(file)
    const frontmatter = fileCache?.frontmatter ?? {}

    if (frontmatter.occurrence_occurred_at) {
      const title = this.removeDatePrefix(file.basename, OCCURRENCE_DATE_FORMAT)
      return this.applyDatePrefix(
        title,
        new Date(frontmatter.occurrence_occurred_at),
        OCCURRENCE_DATE_FORMAT
      )
    }

    return null
  }

  /**
   * Wait for the metadata cache to be ready for a file, then add it to the store
   * This is used for renamed files where the cache might not be immediately available
   */
  public async waitForCacheAndAdd(
    file: TFile,
    addCallback: (file: TFile) => void
  ): Promise<void> {
    const maxAttempts = 10
    const delayMs = 50

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const fileCache = this.app.metadataCache.getFileCache(file)
      if (fileCache && fileCache.frontmatter !== undefined) {
        // Cache is ready, process the file
        addCallback(file)
        return
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // If we get here, the cache never became ready
    console.warn(
      `OccurrenceStore: Cache not ready for renamed file after ${maxAttempts} attempts:`,
      file.path
    )
    // Try to add anyway in case the cache is ready now
    addCallback(file)
  }

  // Utility functions
  private normalizeTags(tags: unknown): string[] {
    if (!tags) return []
    if (Array.isArray(tags)) return tags
    if (typeof tags === "string") return [tags]
    return []
  }

  private removeDatePrefix(basename: string, format: string): string {
    // Convert the format string to a regular expression pattern
    let regexPattern = format
      .replace("YYYY", "\\d{4}")
      .replace("MM", "\\d{2}")
      .replace("DD", "\\d{2}")
      .replace("HH", "\\d{2}")
      .replace("mm", "\\d{2}")
      .replace("ss", "\\d{2}")

    // Create regex from the pattern
    const dateRegex = new RegExp(regexPattern)

    // Replace the matched pattern with an empty string
    return basename.replace(dateRegex, "").trim()
  }

  private applyDatePrefix(title: string, date: Date, format: string): string {
    // Format the date according to the specified format
    const formattedDate = format
      .replace("YYYY", date.getFullYear().toString())
      .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
      .replace("DD", String(date.getDate()).padStart(2, "0"))
      .replace("HH", String(date.getHours()).padStart(2, "0"))
      .replace("mm", String(date.getMinutes()).padStart(2, "0"))
      .replace("ss", String(date.getSeconds()).padStart(2, "0"))

    // Return the title with the date prefix
    return `${formattedDate} ${title}`
  }

  private linksArrayEqual(
    a:
      | Array<{ type: string; target: string; displayText?: string }>
      | undefined,
    b: Array<{ type: string; target: string; displayText?: string }> | undefined
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    return a.every(
      (link, index) =>
        link.type === b[index].type &&
        link.target === b[index].target &&
        link.displayText === b[index].displayText
    )
  }

  private linkEqual(
    a: { type: string; target: string; displayText?: string } | null,
    b: { type: string; target: string; displayText?: string } | null
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return (
      a.type === b.type &&
      a.target === b.target &&
      a.displayText === b.displayText
    )
  }

  private arraysEqual(
    a: string[] | undefined,
    b: string[] | undefined
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    return a.every((val, index) => val === b[index])
  }
}
