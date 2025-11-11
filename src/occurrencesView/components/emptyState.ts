import { Component } from "obsidian"
import { SearchFilters } from "../types"
import { FilterService } from "../services/filterService"

export class EmptyState extends Component {
  private emptyStateEl: HTMLElement
  private currentFilters: SearchFilters
  private filterService: FilterService
  private onResetCallback?: () => void

  constructor(
    container: HTMLElement,
    filterService: FilterService,
    onResetCallback?: () => void
  ) {
    super()
    this.filterService = filterService
    this.onResetCallback = onResetCallback
    this.emptyStateEl = container.createEl("div", {
      cls: "occurrences-empty-state",
    })
    this.emptyStateEl.hide()
    this.currentFilters = {
      search: false,
      searchQuery: "",
      currentFile: false,
      selectedFile: null,
      inbox: false,
      tags: false,
      selectedTags: [],
      dateFilter: false,
      dateFrom: null,
      dateTo: null,
      sortOrder: "desc",
    }
  }

  /**
   * Update the empty state UI based on whether results were found
   */
  public updateEmptyState(isEmpty: boolean, filters?: SearchFilters): void {
    if (filters) {
      this.currentFilters = filters
    }

    if (isEmpty) {
      this.emptyStateEl.show()
      this.emptyStateEl.empty()

      // Create empty state content
      this.emptyStateEl.createEl("p", {
        cls: "empty-state-message",
        text: "No occurrences found matching your search",
      })

      // Create reset filters button
      const resetButton = this.emptyStateEl.createEl("button", {
        cls: "mod-cta empty-state-reset-button",
        text: "Reset Filters",
      })

      this.registerDomEvent(resetButton, "click", () => {
        this.filterService.resetFilters()
        // Sync filter controls UI after reset
        if (this.onResetCallback) {
          this.onResetCallback()
        }
      })
    } else {
      this.emptyStateEl.hide()
    }
  }

  /**
   * Get the empty state element
   */
  public getElement(): HTMLElement {
    return this.emptyStateEl
  }
}
