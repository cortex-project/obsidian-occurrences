import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { SearchOptions, SearchResult } from "../types"

export class SearchService {
  private occurrenceStore: OccurrenceStore

  constructor(occurrenceStore: OccurrenceStore) {
    this.occurrenceStore = occurrenceStore
  }

  /**
   * Execute search with given options
   */
  public search(options: SearchOptions): SearchResult {
    return this.occurrenceStore.search(options)
  }

  /**
   * Check if an item has changed by comparing with the current list item
   */
  public hasItemChanged(
    occurrence: OccurrenceObject,
    currentOccurrence: OccurrenceObject
  ): boolean {
    // Compare key properties that might affect display
    return (
      currentOccurrence.title !== occurrence.title ||
      currentOccurrence.properties.occurredAt.getTime() !==
        occurrence.properties.occurredAt.getTime() ||
      currentOccurrence.properties.toProcess !==
        occurrence.properties.toProcess ||
      JSON.stringify(currentOccurrence.properties.tags) !==
        JSON.stringify(occurrence.properties.tags)
    )
  }

  /**
   * Diff search results against current state
   */
  public diffResults(
    currentPaths: Set<string>,
    newItems: OccurrenceObject[]
  ): {
    toRemove: string[]
    toAdd: OccurrenceObject[]
    toUpdate: OccurrenceObject[]
  } {
    const newPaths = new Set(newItems.map(item => item.file.path))

    // Items to remove (were visible, now not)
    const toRemove = [...currentPaths].filter(path => !newPaths.has(path))

    // Items to add (weren't visible, now are)
    const toAdd = newItems.filter(item => !currentPaths.has(item.file.path))

    // Items to update (were visible, still are, but data changed)
    const toUpdate = newItems.filter(item => currentPaths.has(item.file.path))

    return { toRemove, toAdd, toUpdate }
  }

  /**
   * Check if occurrence store is loaded
   */
  public isStoreLoaded(): boolean {
    return this.occurrenceStore.isLoaded
  }
}
