import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { App, Component, TFile } from "obsidian"

export interface EventCallbacks {
  onStoreLoaded?: () => void
  onItemUpdated?: (occurrence: OccurrenceObject) => void
  onItemRemoved?: (path: string) => void
  onItemAdded?: (occurrence: OccurrenceObject) => void
  onActiveFileChange?: (newActiveFile: TFile | null) => void
}

export class EventService extends Component {
  private occurrenceStore: OccurrenceStore
  private app: App
  private callbacks: EventCallbacks

  constructor(
    occurrenceStore: OccurrenceStore,
    app: App,
    callbacks: EventCallbacks
  ) {
    super()
    this.occurrenceStore = occurrenceStore
    this.app = app
    this.callbacks = callbacks
  }

  /**
   * Register all event listeners
   */
  public registerEvents(): void {
    // Load occurrences when the occurrence store is loaded
    this.registerEvent(
      this.occurrenceStore.on("loaded", () => {
        this.callbacks.onStoreLoaded?.()
      })
    )

    // Update occurrence list item when the occurrence data is updated
    this.registerEvent(
      this.occurrenceStore.on(
        "item-updated",
        (occurrence: OccurrenceObject) => {
          this.callbacks.onItemUpdated?.(occurrence)
        }
      )
    )

    // Remove occurrence list item when the occurrence data is removed
    this.registerEvent(
      this.occurrenceStore.on("item-removed", (path: string) => {
        this.callbacks.onItemRemoved?.(path)
      })
    )

    // Update occurrence list item when the occurrence data is added
    this.registerEvent(
      this.occurrenceStore.on("item-added", (occurrence: OccurrenceObject) => {
        this.callbacks.onItemAdded?.(occurrence)
      })
    )

    // Track active file changes for highlighting
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const newActiveFile = this.app.workspace.getActiveFile()
        this.callbacks.onActiveFileChange?.(newActiveFile)
      })
    )
  }

  /**
   * Update callbacks
   */
  public updateCallbacks(callbacks: Partial<EventCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }
}
