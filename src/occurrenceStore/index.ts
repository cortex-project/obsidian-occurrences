import { OccurrenceObject } from "@/types"
import { App, TFile } from "obsidian"
import { EventHandler } from "./eventHandler"
import { FileOperations } from "./fileOperations"
import { OccurrenceSearch, SearchOptions, SearchResult } from "./search"
import { StoreOperations } from "./storeOperations"

/**
 * Store for managing Occurrence objects
 * Provides functionality for loading, managing, and processing occurrence collections
 */
export class OccurrenceStore {
  protected items: Map<string, OccurrenceObject> = new Map()
  protected isLoading: boolean = false
  private searchService: OccurrenceSearch
  public fileOps: FileOperations
  private storeOps: StoreOperations
  private eventHandler: EventHandler

  constructor(protected app: App) {
    this.searchService = new OccurrenceSearch(app, this.items)
    this.fileOps = new FileOperations(app)
    this.storeOps = new StoreOperations(this.items, this.searchService, null) // Will be set after eventHandler
    this.eventHandler = new EventHandler(app, this.fileOps, this.storeOps)
    this.storeOps.eventHandler = this.eventHandler // Fix the circular reference
    this.eventHandler.registerEvents()
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
        .filter(file => this.fileOps.isRelevantFile(file.path))

      for (const file of files) {
        const processedItem = await this.fileOps.processFile(file)
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
      this.eventHandler.trigger("loaded")
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
    if (!this.fileOps.isRelevantFile(file.path)) {
      console.error(`OccurrenceStore not relevant: ${file.path}`)
      return
    }
    this.fileOps.processFile(file).then(item => {
      if (!item) {
        console.error(`OccurrenceStore not found: ${file.path}`)
        return
      }
      this.storeOps.addOccurrence(item)
    })
  }

  /**
   * Remove an occurrence by its file path
   * @param path The file path of the occurrence to delete
   * @emits deleted { string } - The path of the occurrence that was deleted
   */
  public remove(path: string): void {
    console.info(`OccurrenceStore remove:`, path)
    this.storeOps.removeOccurrenceFromPath(path)
  }

  /**
   * Check if the store has been loaded
   */
  public get isLoaded(): boolean {
    return !this.isLoading && this.items.size > 0
  }

  /**
   * Search occurrences with advanced filtering and pagination
   */
  public search(options: SearchOptions = {}): SearchResult {
    return this.searchService.search(options)
  }

  /**
   * Get all tags with their occurrence counts
   */
  public getAllTags(): Map<string, number> {
    return this.searchService.getAllTags()
  }

  /**
   * Subscribe to store events
   */
  public on(event: string, callback: (...args: any[]) => void) {
    return this.eventHandler.on(event, callback)
  }

  /**
   * Unsubscribe from store events
   */
  public off(event: string, callback: (...args: any[]) => void) {
    this.eventHandler.off(event, callback)
  }

  /**
   * Trigger store events
   */
  public trigger(event: string, ...args: any[]) {
    this.eventHandler.trigger(event, ...args)
  }
}
