import { OccurrenceList, OccurrenceListItem } from "@/components"
import CoretexPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { Header, SearchFilters } from "./header"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  public contentEl: HTMLElement

  // Child components
  private header: Header
  private occurrenceList: OccurrenceList
  private occurrenceStore: OccurrenceStore
  private occurrenceListItems: Map<string, OccurrenceListItem> = new Map()
  private emptyStateEl: HTMLElement

  // State
  private currentActiveFile: TFile | null = null
  private currentFilters: SearchFilters = {
    search: false,
    currentFile: false,
    inbox: false,
  }

  constructor(leaf: WorkspaceLeaf, plugin: CoretexPlugin) {
    super(leaf)
    this.plugin = plugin
    this.app = this.plugin.app
    this.occurrenceStore = plugin.occurrenceStore
  }

  getViewType(): string {
    return OCCURRENCES_VIEW
  }

  getIcon(): string {
    return "calendar-range"
  }

  getDisplayText(): string {
    return "Occurrences"
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.addClass("occurrences-view-container")

    // Create header element
    this.header = new Header(container as HTMLElement, filters =>
      this.handleFilterChange(filters)
    )
    this.addChild(this.header)

    // Create content element
    this.contentEl = container.createEl("div", {
      cls: "view-content",
    })

    // Create empty state element
    this.emptyStateEl = this.contentEl.createEl("div", {
      cls: "occurrences-empty-state",
    })
    this.emptyStateEl.hide()

    // Create unified occurrence list
    const occurrencesContainer = this.contentEl.createEl("div", {
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

    // Register events
    this.registerEvents()

    // Load initial occurrences
    this.loadAndRenderOccurrences()
  }

  private handleFilterChange(filters: SearchFilters): void {
    this.currentFilters = { ...filters }
    this.loadAndRenderOccurrences()
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
          // Skip if the occurrence is not in the current filtered results
          if (!this.occurrenceListItems.get(occurrence.file.path)) return

          // Remove the old occurrence item
          this.occurrenceListItems.delete(occurrence.file.path)
          this.occurrenceList.removeItem(occurrence.file.path)

          // Add the new occurrence item if it still matches current filters
          if (this.matchesCurrentFilters(occurrence)) {
            const listItem = this.occurrenceList.addItem(occurrence)
            this.occurrenceListItems.set(occurrence.file.path, listItem)
          }

          // Update active state
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
        // Only add if it matches current filters
        if (this.matchesCurrentFilters(occurrence)) {
          const listItem = this.occurrenceList.addItem(occurrence)
          this.occurrenceListItems.set(occurrence.file.path, listItem)

          // Update active state for new item
          this.updateActiveFileHighlight(occurrence.file.path)
        }
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

    // Wait for occurrence store to initialize before searching
    if (!this.plugin.occurrenceStore.isLoaded) {
      return
    }

    // Build search options based on current filters
    const searchOptions: any = {
      query: "",
    }

    // Apply current file filter if active
    if (this.currentFilters.currentFile && this.currentActiveFile) {
      searchOptions.linksTo = this.currentActiveFile.path
    }

    // Apply search filter if active
    if (this.currentFilters.search) {
      // For now, search filter does nothing
      // This will be implemented later when search functionality is added
    }

    // Apply inbox filter if active
    if (this.currentFilters.inbox) {
      searchOptions.toProcess = true
    }

    // Give the list instance based on current filters
    const searchResult = this.occurrenceStore.search(searchOptions)

    // Update empty state
    this.updateEmptyState(searchResult.items.length === 0)

    // Add occurrences to the list
    for (const occurrence of searchResult.items) {
      const listItem = this.occurrenceList.addItem(occurrence)
      this.occurrenceListItems.set(occurrence.file.path, listItem)
    }

    // Initialize active state after loading
    this.currentActiveFile = this.plugin.app.workspace.getActiveFile()
    this.updateAllActiveStates()
  }

  private matchesCurrentFilters(occurrence: OccurrenceObject): boolean {
    // Apply current file filter if active
    if (this.currentFilters.currentFile && this.currentActiveFile) {
      const searchResult = this.occurrenceStore.search({
        linksTo: this.currentActiveFile.path,
      })
      if (
        !searchResult.items.some(
          item => item.file.path === occurrence.file.path
        )
      ) {
        return false
      }
    }

    // Apply inbox filter if active
    if (this.currentFilters.inbox) {
      if (!occurrence.properties.toProcess) {
        return false
      }
    }

    return true
  }

  /**
   * Handle active file changes
   */
  private onActiveFileChange(): void {
    const newActiveFile = this.plugin.app.workspace.getActiveFile()

    // For now, update if there's actually a change
    if (newActiveFile !== this.currentActiveFile) {
      this.currentActiveFile = newActiveFile

      // Reload if current file filter is applied
      if (this.currentFilters.currentFile) {
        this.loadAndRenderOccurrences()
      } else {
        // Just update highlights if not filtering by current file
        this.updateAllActiveStates()
      }
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

  /**
   * Update the empty state UI based on whether results were found
   */
  private updateEmptyState(isEmpty: boolean): void {
    if (isEmpty) {
      this.emptyStateEl.show()
      this.emptyStateEl.empty()

      // Create empty state content
      const emptyTitle = this.emptyStateEl.createEl("h3", {
        cls: "empty-state-title",
        text: "No occurrences found",
      })

      const emptyMessage = this.emptyStateEl.createEl("p", {
        cls: "empty-state-message",
      })

      // Build description based on active filters
      const filterDescriptions: string[] = []

      if (this.currentFilters.currentFile && this.currentActiveFile) {
        filterDescriptions.push(
          `linking to "${this.currentActiveFile.basename}"`
        )
      }
      if (this.currentFilters.search) {
        filterDescriptions.push("in search results")
      }
      if (this.currentFilters.inbox) {
        filterDescriptions.push("in inbox")
      }

      let message = "Your current search did not return any results."
      if (filterDescriptions.length > 0) {
        message = `Occurrences ${filterDescriptions.join(" and ")} not found.`
      }

      emptyMessage.setText(message)

      const emptySuggestion = this.emptyStateEl.createEl("p", {
        cls: "empty-state-suggestion",
        text: "Try adjusting your filter settings above.",
      })
    } else {
      this.emptyStateEl.hide()
    }
  }

  async onClose(): Promise<void> {
    // Cleanup will be handled automatically by ItemView for registered child components
  }
}
