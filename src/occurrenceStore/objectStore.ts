import { EventManager } from "@/occurrenceStore/eventManager"
import { App, TFile } from "obsidian"

/**
 * Abstract base class for all object stores
 * Provides common functionality for loading and managing object collections
 */
export abstract class ObjectStore<T> extends EventManager {
  protected items: Map<string, T> = new Map()
  protected isLoading: boolean = false

  constructor(protected app: App) {
    super()
    this.registerEvents()
  }

  /**
   * Register events for the store
   */
  protected registerEvents() {
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

        this.items.set(file.path, item)
        this.emit("item-updated", item)
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
   * Load objects of this type from the vault
   */
  public async load(): Promise<void> {
    if (this.isLoading) return

    const startTime = performance.now()
    this.isLoading = true

    try {
      this.items.clear()

      const files = this.app.vault
        .getMarkdownFiles()
        .filter(file => this.isRelevantFile(file.path))

      for (const file of files) {
        const processedItem = await this.processFile(file)
        if (processedItem) {
          this.items.set(file.path, processedItem)
        }
      }
    } catch (error) {
      console.error(`Error loading ${this.constructor.name}`, error)
    } finally {
      this.isLoading = false
      const endTime = performance.now()
      const duration = (endTime - startTime).toFixed(2)

      console.info(
        `${this.constructor.name}Store: loaded ${this.items.size} items in ${duration}ms`
      )
      this.emit("loaded", this.items)
    }
  }

  /**
   * Get all items in the store
   */
  public getAll(): T[] {
    return Array.from(this.items.values())
  }

  /**
   * Get an item by its file path
   */
  public get(path: string): T | undefined {
    return this.items.get(path)
  }

  /**
   * Add an item to the store
   * @param file The file to add to the store
   * @emits added { T } - The item that was created
   */
  public add(file: TFile): void {
    if (!this.isRelevantFile(file.path)) {
      console.error(`${this.constructor.name} not relevant: ${file.path}`)
      return
    }
    this.processFile(file).then(item => {
      if (!item) {
        console.error(`${this.constructor.name} not found: ${file.path}`)
        return
      }
      this.items.set(file.path, item)
      this.emit("item-added", item)
    })
  }

  /**
   * Remove an item by its file path
   * @param path The file path of the item to delete
   * @emits deleted { T } - The item that was deleted
   */
  public remove(path: string): void {
    console.info(`${this.constructor.name} remove:`, path)
    const item = this.items.get(path)
    if (!item) {
      console.error(`${this.constructor.name} not found: ${path}`)
      return
    }
    this.items.delete(path)
    this.emit("item-removed", path)
  }

  /**
   * Check if the store has been loaded
   */
  public get isLoaded(): boolean {
    return !this.isLoading && this.items.size > 0
  }

  /**
   * Ensure the store is loaded
   */
  public async ensureLoaded(): Promise<void> {
    if (this.isLoaded) {
      return
    }
    if (!this.isLoading) {
      await this.load()
    }
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
      `${this.constructor.name}: Cache not ready for renamed file after ${maxAttempts} attempts:`,
      file.path
    )
    // Try to add anyway in case the cache is ready now
    this.add(file)
  }

  /**
   * Check if a file is relevant to this store
   * @param file The file to check
   */
  public abstract isRelevantFile(path: string): boolean

  /**
   * Process a single file and return its parsed object
   * @param file The file to process
   * @returns The parsed object or null if file should be ignored
   */
  protected abstract processFile(file: TFile): Promise<T | null>

  /**
   * Check if a file's frontmatter has changed in a way that affects our data model
   * @param file The file to check
   * @returns true if the frontmatter has relevant changes
   */
  protected abstract hasRelevantChanges(file: TFile): Promise<boolean>

  /**
   * Generate the expected filename (without extension) for a file based on its content
   * @param file The file to generate a filename for
   * @returns The expected filename or null if file should be ignored
   */
  protected abstract generateFileName(file: TFile): Promise<string | null>
}
