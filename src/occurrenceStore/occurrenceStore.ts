import {
  applyDatePrefix,
  applyFrontmatterUpdates,
  arraysEqual,
  convertListToLinks,
  linkEqual,
  linksArrayEqual,
  normalizeTags,
  OCCURRENCE_FRONTMATTER_MAPPING,
  parseLink,
  removeDatePrefix,
} from "@/occurrenceStore/utils"
import {
  OCCURRENCE_DATE_FORMAT,
  OccurrenceObject,
  OccurrenceProperties,
} from "@/types"
import { TFile } from "obsidian"
import { ObjectStore } from "./objectStore"

export class OccurrenceStore extends ObjectStore<OccurrenceObject> {
  protected async processFile(file: TFile): Promise<OccurrenceObject | null> {
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
      tags: normalizeTags(tags),
      // Include ALL other frontmatter properties in the properties object
      ...otherProperties,
    }

    const occurrence: OccurrenceObject = {
      path: file.path,
      file,
      title: removeDatePrefix(file.basename, OCCURRENCE_DATE_FORMAT),
      class: "Occurrence",
      properties,
    }

    return occurrence
  }

  /**
   * Generate the expected filename (without extension) for a file based on its content
   */
  protected async generateFileName(file: TFile): Promise<string | null> {
    const fileCache = this.app.metadataCache.getFileCache(file)
    const frontmatter = fileCache?.frontmatter ?? {}

    if (frontmatter.occurrence_occurred_at) {
      const title = removeDatePrefix(file.basename, OCCURRENCE_DATE_FORMAT)
      return applyDatePrefix(
        title,
        new Date(frontmatter.occurrence_occurred_at),
        OCCURRENCE_DATE_FORMAT
      )
    }

    return null
  }

  protected async hasRelevantChanges(file: TFile): Promise<boolean> {
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
    const newTags = normalizeTags(tags)

    // Check if core Occurrence properties changed
    if (
      cachedItem.properties.occurredAt.getTime() !== newOccurredAt.getTime() ||
      cachedItem.properties.toProcess !== newToProcess ||
      !linksArrayEqual(cachedItem.properties.participants, newParticipants) ||
      !linksArrayEqual(cachedItem.properties.intents, newIntents) ||
      !linkEqual(cachedItem.properties.location, newLocation) ||
      !arraysEqual(cachedItem.properties.tags, newTags)
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

  public isRelevantFile(filePath: string): boolean {
    return filePath.startsWith("Occurrences/") && filePath.endsWith(".md")
  }

  protected sortItems(items: OccurrenceObject[]): OccurrenceObject[] {
    return items.sort((a, b) => {
      // Sort by date descending (newest first), then by title
      const dateComparison =
        b.properties.occurredAt.getTime() - a.properties.occurredAt.getTime()
      return dateComparison !== 0
        ? dateComparison
        : a.title.localeCompare(b.title)
    })
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
    const fileName = applyDatePrefix(title, occurredAt, OCCURRENCE_DATE_FORMAT)
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
        const newFileName = applyDatePrefix(
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
   * Get occurrences to process
   */
  public getOccurrencesToProcess(): OccurrenceObject[] {
    return Array.from(this.items.values()).filter(
      occurrence => occurrence.properties.toProcess
    )
  }

  /**
   * Get occurrences by date range
   */
  public getOccurrencesByDateRange(
    startDate: Date,
    endDate: Date
  ): OccurrenceObject[] {
    return Array.from(this.items.values()).filter(occurrence => {
      const occurredAt = occurrence.properties.occurredAt
      return occurredAt >= startDate && occurredAt <= endDate
    })
  }
}
