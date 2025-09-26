import { convertListToLinks, parseLink } from "@/linkUtils"
import {
  OCCURRENCE_DATE_FORMAT,
  OccurrenceObject,
  OccurrenceProperties,
} from "@/types"
import { App, Events, TFile } from "obsidian"
import {
  applyFrontmatterUpdates,
  OCCURRENCE_FRONTMATTER_MAPPING,
} from "./frontmatterMapping"
import { OccurrenceSearch, SearchOptions, SearchResult } from "./search"

/**
 * Store for managing Occurrence objects
 * Provides functionality for loading, managing, and processing occurrence collections
 */
export class OccurrenceStore extends Events {
  protected items: Map<string, OccurrenceObject> = new Map()
  protected isLoading: boolean = false
  private searchService: OccurrenceSearch

  constructor(protected app: App) {
    super()
    this.searchService = new OccurrenceSearch(app, this.items)
    this.registerEvents()
  }

  // Utility functions (previously in comparisonUtils.ts)
  private static linksArrayEqual(
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

  private static linkEqual(
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

  private static arraysEqual(
    a: string[] | undefined,
    b: string[] | undefined
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    if (a.length !== b.length) return false
    return a.every((val, index) => val === b[index])
  }

  // Utility functions (previously in tagUtils.ts)
  private static normalizeTags(tags: unknown): string[] {
    if (!tags) return []
    if (Array.isArray(tags)) return tags
    if (typeof tags === "string") return [tags]
    return []
  }

  // Utility functions (previously in dateUtils.ts)
  private static removeDatePrefix(basename: string, format: string): string {
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

  private static applyDatePrefix(
    title: string,
    date: Date,
    format: string
  ): string {
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

  private static toISOStringWithTimezone(date: Date): string {
    const localISOTime = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, -1)

    const offset = date.getTimezoneOffset()
    const offsetHours = Math.floor(Math.abs(offset) / 60)
    const offsetMinutes = Math.abs(offset) % 60
    const offsetSign = offset <= 0 ? "+" : "-"
    const offsetString = `${offsetSign}${offsetHours
      .toString()
      .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

    return localISOTime + offsetString
  }

  /**
   * Register events for the store
   */
  private registerEvents() {
    this.app.workspace.onLayoutReady(() => {
      this.app.vault.on(
        "create",
        file =>
          file instanceof TFile &&
          this.isRelevantFile(file.path) &&
          this.waitForCacheAndAdd(file)
      )
      this.app.vault.on(
        "delete",
        file =>
          file instanceof TFile &&
          this.isRelevantFile(file.path) &&
          this.remove(file.path)
      )
      this.app.vault.on("rename", (file, oldPath) => {
        if (!(file instanceof TFile)) return
        if (this.isRelevantFile(oldPath)) this.remove(oldPath)
        // Handle renamed files with polling to ensure cache is ready
        if (this.isRelevantFile(file.path)) {
          this.waitForCacheAndAdd(file)
        }
      })
      this.app.metadataCache.on("changed", async file => {
        if (!(file instanceof TFile) || !this.isRelevantFile(file.path)) return

        // Check if file needs to be renamed based on content changes
        const expectedFileName = await this.generateFileName(file)
        if (expectedFileName && expectedFileName !== file.basename) {
          await this.handleFileRename(file, expectedFileName)
          return // Rename will trigger its own events, so we're done
        }

        // Check if content has relevant changes that require updating the item
        // TODO: Get rid once all views are using incremental updates
        const hasChanges = await this.hasRelevantChanges(file)
        if (!hasChanges) return

        const item = await this.processFile(file)
        if (!item) return

        // Update search indexes for the updated item
        this.searchService.updateIndexes(item, "remove") // Remove old version
        this.items.set(file.path, item)
        this.searchService.updateIndexes(item, "add") // Add updated version
        this.trigger("item-updated", item)
      })
    })
  }

  /**
   * Handle renaming a file when its content requires a different filename
   */
  private async handleFileRename(
    file: TFile,
    newFileName: string
  ): Promise<void> {
    const newFilePath = `${file.parent?.path || ""}${
      file.parent?.path ? "/" : ""
    }${newFileName}.md`

    // Check if target filename already exists
    if (this.app.vault.getAbstractFileByPath(newFilePath)) {
      console.warn(
        `Cannot rename ${file.path} to ${newFilePath}: target file already exists`
      )
      return
    }

    try {
      // Remove the current item before renaming
      this.remove(file.path)

      // Rename the file - this will trigger the rename event handlers which will add the new item
      await this.app.fileManager.renameFile(file, newFilePath)
    } catch (error) {
      console.error(
        `Error renaming file ${file.path} to ${newFilePath}:`,
        error
      )
      // Re-add the item if rename failed
      this.add(file)
    }
  }

  /**
   * Load occurrences from the vault
   */
  public async load(): Promise<void> {
    if (this.isLoading) return

    const startTime = performance.now()
    this.isLoading = true

    try {
      this.items.clear()
      this.searchService.clear()

      const files = this.app.vault
        .getMarkdownFiles()
        .filter(file => this.isRelevantFile(file.path))

      for (const file of files) {
        const processedItem = await this.processFile(file)
        if (processedItem) {
          this.items.set(file.path, processedItem)
          this.searchService.updateIndexes(processedItem, "add")
        }
      }
    } catch (error) {
      console.error(`Error loading OccurrenceStore`, error)
    } finally {
      this.isLoading = false
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)

      console.info(
        `OccurrenceStore: loaded ${this.items.size} items in ${duration}ms`
      )
      this.trigger("loaded")
    }
  }

  /**
   * Get an occurrence by its file path
   */
  public get(path: string): OccurrenceObject | undefined {
    return this.items.get(path)
  }

  /**
   * Add an occurrence to the store
   * @param file The file to add to the store
   * @emits added { OccurrenceObject } - The occurrence that was created
   */
  public add(file: TFile): void {
    if (!this.isRelevantFile(file.path)) {
      console.error(`OccurrenceStore not relevant: ${file.path}`)
      return
    }
    this.processFile(file).then(item => {
      if (!item) {
        console.error(`OccurrenceStore not found: ${file.path}`)
        return
      }
      this.items.set(file.path, item)
      this.searchService.updateIndexes(item, "add")
      this.trigger("item-added", item)
    })
  }

  /**
   * Remove an occurrence by its file path
   * @param path The file path of the occurrence to delete
   * @emits deleted { string } - The path of the occurrence that was deleted
   */
  public remove(path: string): void {
    console.info(`OccurrenceStore remove:`, path)
    const item = this.items.get(path)
    if (!item) {
      console.error(`OccurrenceStore not found: ${path}`)
      return
    }
    this.searchService.updateIndexes(item, "remove")
    this.items.delete(path)
    this.trigger("item-removed", path)
  }

  /**
   * Check if the store has been loaded
   */
  public get isLoaded(): boolean {
    return !this.isLoading && this.items.size > 0
  }

  /**
   * Wait for the metadata cache to be ready for a file, then add it to the store
   * This is used for renamed files where the cache might not be immediately available
   */
  private async waitForCacheAndAdd(file: TFile): Promise<void> {
    const maxAttempts = 10
    const delayMs = 50

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const fileCache = this.app.metadataCache.getFileCache(file)
      if (fileCache && fileCache.frontmatter !== undefined) {
        // Cache is ready, process the file
        this.add(file)
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
    this.add(file)
  }

  /**
   * Check if a file is relevant to this store
   * @param file The file to check
   */
  private isRelevantFile(filePath: string): boolean {
    return filePath.startsWith("Occurrences/") && filePath.endsWith(".md")
  }

  /**
   * Process a single file and return its parsed occurrence object
   * @param file The file to process
   * @returns The parsed occurrence object or null if file should be ignored
   */
  private async processFile(file: TFile): Promise<OccurrenceObject | null> {
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
      tags: OccurrenceStore.normalizeTags(tags),
      // Include ALL other frontmatter properties in the properties object
      ...otherProperties,
    }

    const occurrence: OccurrenceObject = {
      path: file.path,
      file,
      title: OccurrenceStore.removeDatePrefix(
        file.basename,
        OCCURRENCE_DATE_FORMAT
      ),
      class: "Occurrence",
      properties,
    }

    return occurrence
  }

  /**
   * Check if a file's frontmatter has changed in a way that affects our data model
   * @param file The file to check
   * @returns true if the frontmatter has relevant changes
   */
  private async hasRelevantChanges(file: TFile): Promise<boolean> {
    const fileCache = this.app.metadataCache.getFileCache(file)
    if (!fileCache || !fileCache.frontmatter) return false

    const cachedItem = this.items.get(file.path)
    if (!cachedItem) return true // New file

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
    const newTags = OccurrenceStore.normalizeTags(tags)

    // Check if core Occurrence properties changed
    if (
      cachedItem.properties.occurredAt.getTime() !== newOccurredAt.getTime() ||
      cachedItem.properties.toProcess !== newToProcess ||
      !OccurrenceStore.linksArrayEqual(
        cachedItem.properties.participants,
        newParticipants
      ) ||
      !OccurrenceStore.linksArrayEqual(
        cachedItem.properties.intents,
        newIntents
      ) ||
      !OccurrenceStore.linkEqual(cachedItem.properties.location, newLocation) ||
      !OccurrenceStore.arraysEqual(cachedItem.properties.tags, newTags)
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
  private async generateFileName(file: TFile): Promise<string | null> {
    const fileCache = this.app.metadataCache.getFileCache(file)
    const frontmatter = fileCache?.frontmatter ?? {}

    if (frontmatter.occurrence_occurred_at) {
      const title = OccurrenceStore.removeDatePrefix(
        file.basename,
        OCCURRENCE_DATE_FORMAT
      )
      return OccurrenceStore.applyDatePrefix(
        title,
        new Date(frontmatter.occurrence_occurred_at),
        OCCURRENCE_DATE_FORMAT
      )
    }

    return null
  }

  /**
   * Create a new Occurrence file
   * @param {Partial<OccurrenceObject>} occurrenceData - The Occurrence data to create
   * @returns {Promise<TFile>} - A promise that resolves when the Occurrence file is created
   */
  public async create(
    occurrenceData: Partial<OccurrenceObject>
  ): Promise<TFile> {
    const title = occurrenceData.title || "Untitled Occurrence"
    const occurredAt = occurrenceData.properties?.occurredAt || new Date()

    // Generate filename with date prefix
    const fileName = OccurrenceStore.applyDatePrefix(
      title,
      occurredAt,
      OCCURRENCE_DATE_FORMAT
    )
    const filePath = `Occurrences/${fileName}.md`

    // Check if file already exists
    if (this.app.vault.getAbstractFileByPath(filePath)) {
      throw new Error(
        `An occurrence with this title already exists: "${title}"`
      )
    }

    const file = await this.app.vault.create(filePath, "")

    // Prepare properties for frontmatter
    const properties = occurrenceData.properties || {
      occurredAt: new Date(),
      toProcess: true,
      participants: [],
      intents: [],
      location: null,
      tags: [],
    }

    await this.app.fileManager.processFrontMatter(file, frontmatter => {
      // Convert properties back to frontmatter format using existing mapping system
      const flattenedUpdates = {
        ...properties, // Include all other dynamic properties first
        occurredAt: properties.occurredAt, // Then override with known properties
        toProcess: properties.toProcess,
        participants: properties.participants,
        intents: properties.intents,
        location: properties.location,
        tags: properties.tags,
      }

      applyFrontmatterUpdates(
        frontmatter,
        flattenedUpdates as any,
        OCCURRENCE_FRONTMATTER_MAPPING
      )
    })

    return file
  }

  /**
   * Update an occurrence file
   */
  public async update(
    file: TFile,
    updates: Partial<OccurrenceObject>
  ): Promise<OccurrenceObject> {
    const currentOccurrence = this.items.get(file.path)
    if (!currentOccurrence) {
      throw new Error(`Occurrence not found: ${file.path}`)
    }

    try {
      // Handle file rename if title or date has changed
      if (updates.title || updates.properties?.occurredAt) {
        const newTitle = updates.title || currentOccurrence.title
        const newOccurredAt =
          updates.properties?.occurredAt ||
          currentOccurrence.properties.occurredAt
        const newFileName = OccurrenceStore.applyDatePrefix(
          newTitle,
          newOccurredAt,
          OCCURRENCE_DATE_FORMAT
        )
        const newPath = `Occurrences/${newFileName}.md`

        // Check if target filename already exists (and it's not the same file)
        if (
          newPath !== file.path &&
          this.app.vault.getAbstractFileByPath(newPath)
        ) {
          throw new Error(
            `An Occurrence named '${newTitle}' already exists for that date`
          )
        }

        // Rename the file if necessary
        if (newPath !== file.path) {
          await this.app.fileManager.renameFile(file, newPath)
        }
      }

      // Merge properties updates with existing properties
      const updatedProperties = {
        ...currentOccurrence.properties,
        ...updates.properties,
      }

      // Update frontmatter using the mapping system - flatten properties back to frontmatter format
      await this.app.fileManager.processFrontMatter(file, frontmatter => {
        const flattenedUpdates = {
          title: updates.title,
          ...updatedProperties, // Include all other dynamic properties first
          occurredAt: updatedProperties.occurredAt, // Then override with known properties
          toProcess: updatedProperties.toProcess,
          participants: updatedProperties.participants,
          intents: updatedProperties.intents,
          location: updatedProperties.location,
          tags: updatedProperties.tags,
        }

        applyFrontmatterUpdates(
          frontmatter,
          flattenedUpdates as any,
          OCCURRENCE_FRONTMATTER_MAPPING
        )
      })

      // Return the updated occurrence (will be refreshed by file change handler)
      const updatedItem = await this.processFile(file)
      if (updatedItem) {
        this.items.set(file.path, updatedItem)
        return updatedItem
      }

      throw new Error("Failed to process updated file")
    } catch (error) {
      console.error(
        `Failed to update Occurrence: ${currentOccurrence.title}`,
        error
      )
      throw error
    }
  }

  /**
   * Delete an Occurrence
   */
  public async delete(filePath: string): Promise<void> {
    const occurrence = this.items.get(filePath)
    if (!occurrence) {
      throw new Error(`Occurrence not found: ${filePath}`)
    }

    try {
      await this.app.vault.trash(occurrence.file, false)
    } catch (error) {
      console.error(`Failed to delete Occurrence: ${occurrence.title}`, error)
      throw error
    }
  }

  /**
   * Search occurrences with advanced filtering and pagination
   */
  public search(options: SearchOptions = {}): SearchResult {
    return this.searchService.search(options)
  }
}
