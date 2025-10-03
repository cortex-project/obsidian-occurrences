import { OccurrenceList, OccurrenceListItem } from "@/components"
import OccurrencesPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { Component, TFile } from "obsidian"

export class SearchTab extends Component {
  private containerEl: HTMLElement
  private plugin: OccurrencesPlugin
  private occurrenceStore: OccurrenceStore
  private occurrenceList: OccurrenceList
  private occurrenceListItems: Map<string, OccurrenceListItem> = new Map()
  private occurrences: OccurrenceObject[] = []
  private currentActiveFile: TFile | null = null
  public id: string = "search"

  constructor(containerEl: HTMLElement, plugin: OccurrencesPlugin) {
    super()
    this.containerEl = containerEl.createEl("div")
    this.plugin = plugin
    this.occurrenceStore = plugin.occurrenceStore

    // Create occurrence list element
    const occurrencesContainer = this.containerEl.createEl("div", {
      cls: "occurrences-view-content-container",
    })
    this.occurrenceList = new OccurrenceList(
      this.plugin,
      occurrencesContainer,
      {
        groupBy: "day",
        listItemOptions: {
          showTime: true,
          showProcessIcon: true,
        },
      }
    )
    this.addChild(this.occurrenceList)

    // Load occurrences if the occurrence store is alreadyloaded
    if (this.occurrenceStore.isLoaded) {
      this.loadAndRenderOccurrences()
    }

    this.registerEvents()
  }

  private registerEvents(): void {
    // Load occurrences when the occurrence store is loaded
    this.registerEvent(
      this.occurrenceStore.on("loaded", () => {
        this.loadAndRenderOccurrences()
      })
    )

    // Update occurrence list item when the occurrence data is updated
    this.registerEvent(
      this.occurrenceStore.on(
        "item-updated",
        (occurrence: OccurrenceObject) => {
          // Skip if the occurrence is not in the list
          if (!this.occurrenceListItems.get(occurrence.file.path)) return

          // Remove the old occurrence item
          this.occurrenceListItems.delete(occurrence.file.path)
          this.occurrenceList.removeItem(occurrence.file.path)

          // Add the new occurrence item
          const listItem = this.occurrenceList.addItem(occurrence)
          this.occurrenceListItems.set(occurrence.file.path, listItem)

          // Update active state for new/updated item
          this.updateActiveFileHighlight(occurrence.file.path)
        }
      )
    )

    // Remove occurrence list item when the occurrence data is removed
    this.registerEvent(
      this.occurrenceStore.on("item-removed", (path: string) => {
        this.occurrenceListItems.delete(path)
        this.occurrenceList.removeItem(path)
      })
    )

    // Update occurrence list item when the occurrence data is added
    this.registerEvent(
      this.occurrenceStore.on("item-added", (occurrence: OccurrenceObject) => {
        const listItem = this.occurrenceList.addItem(occurrence)
        this.occurrenceListItems.set(occurrence.file.path, listItem)

        // Update active state for new item
        this.updateActiveFileHighlight(occurrence.file.path)
      })
    )

    // Track active file changes for highlighting
    this.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.onActiveFileChange()
      })
    )
  }

  private loadAndRenderOccurrences(): void {
    this.occurrenceListItems.clear()
    this.occurrenceList.empty()
    this.occurrences = this.occurrenceStore.search({
      query: "",
    }).items
    for (const occurrence of this.occurrences) {
      const listItem = this.occurrenceList.addItem(occurrence)
      this.occurrenceListItems.set(occurrence.file.path, listItem)
    }

    // Initialize active state after loading
    this.currentActiveFile = this.plugin.app.workspace.getActiveFile()
    this.updateAllActiveStates()
  }

  /**
   * Handle active file changes
   */
  private onActiveFileChange(): void {
    const newActiveFile = this.plugin.app.workspace.getActiveFile()

    // Only update if there's actually a change
    if (newActiveFile !== this.currentActiveFile) {
      this.currentActiveFile = newActiveFile
      this.updateAllActiveStates()
    }
  }

  /**
   * Update active highlighting for a specific file
   */
  private updateActiveFileHighlight(filePath: string): void {
    if (!this.currentActiveFile || filePath !== this.currentActiveFile.path) {
      return
    }

    const listItem = this.occurrenceListItems.get(filePath)
    if (listItem) {
      listItem.setActive(true)
    }
  }

  /**
   * Update active highlighting for all items
   */
  private updateAllActiveStates(): void {
    this.occurrenceListItems.forEach((listItem, filePath) => {
      const isActive = this.currentActiveFile?.path === filePath
      listItem.setActive(isActive)
    })
  }

  public hide(): void {
    this.containerEl.hide()
  }

  public show(): void {
    this.containerEl.show()
    this.loadAndRenderOccurrences()
  }
}
