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
    // Get the old item before updating to properly remove old indexes
    const oldItem = this.items.get(item.path)

    // Update search indexes for the old item (remove old tags/indexes)
    if (oldItem) {
      this.searchService.updateIndexes(oldItem, "remove")
    }

    // Update the item in the store
    this.items.set(item.path, item)

    // Update search indexes for the new item (add new tags/indexes)
    this.searchService.updateIndexes(item, "add")

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
