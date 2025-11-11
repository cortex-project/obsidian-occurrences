import { OccurrenceList, OccurrenceListItem } from "@/occurrenceList"
import OccurrencesPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { EmptyState } from "./components/emptyState"
import { Header } from "./header"
import { EventService } from "./services/eventService"
import { FilterService } from "./services/filterService"
import { SearchService } from "./services/searchService"
import { SearchFilters } from "./types"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: OccurrencesPlugin
  // UI elements
  public contentEl: HTMLElement

  // Child components
  private header: Header
  private occurrenceList: OccurrenceList
  private occurrenceStore: OccurrenceStore
  private occurrenceListItems: Map<string, OccurrenceListItem> = new Map()
  private emptyState: EmptyState

  // Services
  private filterService: FilterService
  private searchService: SearchService
  private eventService: EventService

  // State
  private currentActiveFile: TFile | null = null

  constructor(leaf: WorkspaceLeaf, plugin: OccurrencesPlugin) {
    super(leaf)
    this.plugin = plugin
    this.app = this.plugin.app
    this.occurrenceStore = plugin.occurrenceStore

    // Initialize services
    this.filterService = new FilterService(filters =>
      this.handleFilterChange(filters)
    )
    this.searchService = new SearchService(this.occurrenceStore)
    this.eventService = new EventService(this.occurrenceStore, this.app, {
      onStoreLoaded: () => this.loadAndRenderOccurrences(),
      onItemUpdated: () => this.refreshFilteredResults(),
      onItemRemoved: (path: string) => this.removeItemFromList(path),
      onItemAdded: () => this.refreshFilteredResults(),
      onActiveFileChange: (newActiveFile: TFile | null) =>
        this.onActiveFileChange(newActiveFile),
    })
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
    this.header = new Header(
      container as HTMLElement,
      this.app,
      this.occurrenceStore,
      this.filterService,
      filters => this.handleFilterChange(filters)
    )
    this.addChild(this.header)

    // Create content element
    this.contentEl = container.createEl("div", {
      cls: "view-content",
    })

    // Create empty state component
    this.emptyState = new EmptyState(
      this.contentEl,
      this.filterService,
      () => this.header.syncFilterControls()
    )
    this.addChild(this.emptyState)

    // Create unified occurrence list
    const occurrencesContainer = this.contentEl.createEl("div", {
      cls: "occurrences-view-content-container",
    })
    this.occurrenceList = new OccurrenceList(
      this.plugin,
      occurrencesContainer,
      "day"
    )
    this.addChild(this.occurrenceList)

    // Register events
    this.eventService.registerEvents()
    this.addChild(this.eventService)

    // Load initial occurrences
    this.loadAndRenderOccurrences()
  }

  private handleFilterChange(filters: SearchFilters): void {
    this.loadAndRenderOccurrences()
  }

  private loadAndRenderOccurrences(): void {
    this.occurrenceListItems.clear()
    this.occurrenceList.empty()

    // Wait for occurrence store to initialize before searching
    if (!this.searchService.isStoreLoaded()) {
      return
    }

    // Build search options from current filters
    const searchOptions = this.filterService.buildSearchOptions()

    // Set sort order on occurrence list before adding items
    const filters = this.filterService.getFilters()
    this.occurrenceList.setSortOrder(filters.sortOrder)

    // Execute search
    const searchResult = this.searchService.search(searchOptions)

    // Update summary in header
    this.header.updateSummary(
      searchResult.pagination.total,
      searchResult.metadata,
      searchResult.pagination
    )

    // Update empty state and show/hide list accordingly
    const isEmpty = searchResult.items.length === 0
    this.emptyState.updateEmptyState(isEmpty, this.filterService.getFilters())
    
    // Get the occurrences container to show/hide it
    const occurrencesContainer = this.contentEl.querySelector(
      ".occurrences-view-content-container"
    ) as HTMLElement
    
    if (isEmpty) {
      // Hide the occurrence list when empty
      if (occurrencesContainer) {
        occurrencesContainer.hide()
      }
    } else {
      // Show the occurrence list when there are results
      if (occurrencesContainer) {
        occurrencesContainer.show()
      }
      
      // Add occurrences to the list
      for (const occurrence of searchResult.items) {
        const listItem = this.occurrenceList.addItem(occurrence)
        this.occurrenceListItems.set(occurrence.file.path, listItem)
      }
    }

    // Initialize active state after loading
    this.currentActiveFile = this.plugin.app.workspace.getActiveFile()
    this.updateAllActiveStates()
  }

  /**
   * Refresh the filtered results by running a new search and applying incremental updates
   * This preserves scroll position and UI state while handling filter changes
   */
  private refreshFilteredResults(): void {
    // Wait for occurrence store to initialize before searching
    if (!this.searchService.isStoreLoaded()) {
      return
    }

    // Build search options from current filters
    const searchOptions = this.filterService.buildSearchOptions()

    // Set sort order on occurrence list before adding items
    const filters = this.filterService.getFilters()
    this.occurrenceList.setSortOrder(filters.sortOrder)

    // Execute search
    const searchResult = this.searchService.search(searchOptions)

    // Update summary in header
    this.header.updateSummary(
      searchResult.pagination.total,
      searchResult.metadata,
      searchResult.pagination
    )

    // Diff against current state
    const currentPaths = new Set(this.occurrenceListItems.keys())
    const diff = this.searchService.diffResults(
      currentPaths,
      searchResult.items
    )

    // Apply changes incrementally
    diff.toRemove.forEach(path => this.removeItemFromList(path))
    diff.toAdd.forEach(occurrence => this.addItemToList(occurrence))
    diff.toUpdate.forEach(occurrence => this.updateItemInList(occurrence))

    // Update empty state and show/hide list accordingly
    const isEmpty = searchResult.items.length === 0
    this.emptyState.updateEmptyState(isEmpty, this.filterService.getFilters())
    
    // Get the occurrences container to show/hide it
    const occurrencesContainer = this.contentEl.querySelector(
      ".occurrences-view-content-container"
    ) as HTMLElement
    
    if (isEmpty) {
      // Hide the occurrence list when empty
      if (occurrencesContainer) {
        occurrencesContainer.hide()
      }
    } else {
      // Show the occurrence list when there are results
      if (occurrencesContainer) {
        occurrencesContainer.show()
      }
    }

    // Update active states for all items
    this.updateAllActiveStates()
  }

  /**
   * Remove an item from the list
   */
  private removeItemFromList(path: string): void {
    this.occurrenceListItems.delete(path)
    this.occurrenceList.removeItem(path)
  }

  /**
   * Add an item to the list
   */
  private addItemToList(occurrence: OccurrenceObject): void {
    const listItem = this.occurrenceList.addItem(occurrence)
    this.occurrenceListItems.set(occurrence.file.path, listItem)
    this.updateActiveFileHighlight(occurrence.file.path)
  }

  /**
   * Update an existing item in the list
   */
  private updateItemInList(occurrence: OccurrenceObject): void {
    // Remove old item
    this.occurrenceListItems.delete(occurrence.file.path)
    this.occurrenceList.removeItem(occurrence.file.path)

    // Add updated item
    const listItem = this.occurrenceList.addItem(occurrence)
    this.occurrenceListItems.set(occurrence.file.path, listItem)
    this.updateActiveFileHighlight(occurrence.file.path)
  }

  /**
   * Handle active file changes
   */
  private onActiveFileChange(newActiveFile: TFile | null): void {
    // For now, update if there's actually a change
    if (newActiveFile !== this.currentActiveFile) {
      this.currentActiveFile = newActiveFile

      const filters = this.filterService.getFilters()

      // Update the file selector's active file only if it's in current file mode
      if (filters.currentFile) {
        this.header.updateActiveFile()
      }

      // Reload if current file mode is active (watching for active file changes)
      if (filters.currentFile) {
        this.loadAndRenderOccurrences()
      } else {
        // Just update highlights if not in current file mode
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

  async onClose(): Promise<void> {
    // Cleanup will be handled automatically by ItemView for registered child components
  }
}
