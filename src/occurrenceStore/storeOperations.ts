import { OccurrenceObject } from "@/types"
import { EventHandler } from "./eventHandler"
import { OccurrenceSearch } from "./search"

/**
 * Store operations for OccurrenceStore
 * Handles adding, updating, and removing items from the store
 */
export class StoreOperations {
  constructor(
    private items: Map<string, OccurrenceObject>,
    private searchService: OccurrenceSearch,
    public eventHandler: EventHandler | null
  ) {}

  /**
   * Add an occurrence to the store and update search indexes
   */
  public addOccurrence(item: OccurrenceObject): void {
    this.items.set(item.path, item)
    this.searchService.updateIndexes(item, "add")
    this.eventHandler?.trigger("item-added", item)
  }

  /**
   * Update an occurrence in the store and update search indexes
   */
  public updateOccurrence(item: OccurrenceObject): void {
    // Update search indexes for the updated item
    this.searchService.updateIndexes(item, "remove") // Remove old version
    this.items.set(item.path, item)
    this.searchService.updateIndexes(item, "add") // Add updated version
    this.eventHandler?.trigger("item-updated", item)
  }

  /**
   * Remove an occurrence from the store and update search indexes
   */
  public removeOccurrenceFromPath(path: string): void {
    const item = this.items.get(path)
    if (item) {
      this.searchService.updateIndexes(item, "remove")
    }
    this.items.delete(path)
    this.eventHandler?.trigger("item-removed", path)
  }

  /**
   * Get an occurrence by path
   */
  public getOccurrence(path: string): OccurrenceObject | undefined {
    return this.items.get(path)
  }

  /**
   * Check if an occurrence exists
   */
  public hasOccurrence(path: string): boolean {
    return this.items.has(path)
  }
}
