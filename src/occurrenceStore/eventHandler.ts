import { App, Events, TFile } from "obsidian"
import { FileOperations } from "./fileOperations"
import { StoreOperations } from "./storeOperations"

/**
 * Event handler for OccurrenceStore
 * Handles file system events and metadata cache changes
 */
export class EventHandler extends Events {
  constructor(
    private app: App,
    private fileOps: FileOperations,
    private storeOps: StoreOperations
  ) {
    super()
  }

  /**
   * Register events for the store
   */
  public registerEvents(): void {
    this.app.workspace.onLayoutReady(() => {
      this.app.vault.on("create", file => {
        if (file instanceof TFile) this.onFileCreated(file)
      })
      this.app.vault.on("delete", file => {
        if (file instanceof TFile) this.onFileDeleted(file)
      })
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile) this.onFileRenamed(file, oldPath)
      })
      this.app.metadataCache.on("changed", file => {
        if (file instanceof TFile) this.onMetadataChanged(file)
      })
    })
  }

  /**
   * Handle file creation events
   */
  private async onFileCreated(file: TFile): Promise<void> {
    if (!this.fileOps.isRelevantFile(file.path)) return

    await this.fileOps.waitForCacheAndAdd(file, file =>
      this.addOccurrenceFromFile(file)
    )
  }

  /**
   * Handle file deletion events
   */
  private async onFileDeleted(file: TFile): Promise<void> {
    if (!this.fileOps.isRelevantFile(file.path)) return

    this.storeOps.removeOccurrenceFromPath(file.path)
  }

  /**
   * Handle file rename events
   */
  private async onFileRenamed(file: TFile, oldPath: string): Promise<void> {
    if (!(file instanceof TFile)) return

    // Remove from old path if it was relevant
    if (this.fileOps.isRelevantFile(oldPath)) {
      this.storeOps.removeOccurrenceFromPath(oldPath)
    }

    // Add to new path if it's relevant
    if (this.fileOps.isRelevantFile(file.path)) {
      await this.fileOps.waitForCacheAndAdd(file, file =>
        this.addOccurrenceFromFile(file)
      )
    }
  }

  /**
   * Handle metadata cache change events
   */
  private async onMetadataChanged(file: TFile): Promise<void> {
    if (!this.fileOps.isRelevantFile(file.path)) return

    // Check if file needs to be renamed based on content changes
    const expectedFileName = await this.fileOps.generateFileName(file)
    if (expectedFileName && expectedFileName !== file.basename) {
      await this.handleFileRename(file, expectedFileName)
      return // Rename will trigger its own events, so we're done
    }

    // Check if content has relevant changes that require updating the item
    const cachedItem = this.storeOps.getOccurrence(file.path)
    if (!cachedItem) return // New file, will be handled by create event

    const hasChanges = await this.fileOps.hasRelevantChanges(file, cachedItem)
    if (!hasChanges) return

    const item = await this.fileOps.processFile(file)
    if (!item) return

    this.storeOps.updateOccurrence(item)
  }

  /**
   * Add an occurrence from a file
   */
  private async addOccurrenceFromFile(file: TFile): Promise<void> {
    const item = await this.fileOps.processFile(file)
    if (!item) return

    this.storeOps.addOccurrence(item)
  }

  /**
   * Handle file renaming when content requires a different filename
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
      this.storeOps.removeOccurrenceFromPath(file.path)

      // Rename the file - this will trigger the rename event handlers which will add the new item
      await this.app.fileManager.renameFile(file, newFilePath)
    } catch (error) {
      console.error(
        `Error renaming file ${file.path} to ${newFilePath}:`,
        error
      )
      // Re-add the item if rename failed
      this.addOccurrenceFromFile(file)
    }
  }
}
