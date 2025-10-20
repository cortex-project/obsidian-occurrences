import { Component } from "obsidian"
import { SearchFilters } from "../types"

export class EmptyState extends Component {
  private emptyStateEl: HTMLElement
  private currentFilters: SearchFilters

  constructor(container: HTMLElement) {
    super()
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
      const emptyTitle = this.emptyStateEl.createEl("h3", {
        cls: "empty-state-title",
        text: "No occurrences found",
      })

      const emptyMessage = this.emptyStateEl.createEl("p", {
        cls: "empty-state-message",
      })

      // Build description based on active filters
      const filterDescriptions: string[] = []

      if (this.currentFilters.currentFile || this.currentFilters.selectedFile) {
        const fileName =
          this.currentFilters.selectedFile?.split("/").pop() ||
          this.currentFilters.selectedFile
        filterDescriptions.push(`linking to "${fileName}"`)
      }
      if (this.currentFilters.searchQuery) {
        filterDescriptions.push(`matching "${this.currentFilters.searchQuery}"`)
      }
      if (this.currentFilters.inbox) {
        filterDescriptions.push("in inbox")
      }
      if (
        this.currentFilters.tags &&
        this.currentFilters.selectedTags.length > 0
      ) {
        const tagList = this.currentFilters.selectedTags.join(", ")
        filterDescriptions.push(`with tags "${tagList}"`)
      }
      if (
        this.currentFilters.dateFilter &&
        (this.currentFilters.dateFrom || this.currentFilters.dateTo)
      ) {
        if (this.currentFilters.dateFrom && this.currentFilters.dateTo) {
          const fromStr = this.currentFilters.dateFrom.toLocaleDateString()
          const toStr = this.currentFilters.dateTo.toLocaleDateString()
          filterDescriptions.push(`between ${fromStr} and ${toStr}`)
        } else if (this.currentFilters.dateFrom) {
          const dateStr = this.currentFilters.dateFrom.toLocaleDateString()
          filterDescriptions.push(`on ${dateStr}`)
        } else if (this.currentFilters.dateTo) {
          const dateStr = this.currentFilters.dateTo.toLocaleDateString()
          filterDescriptions.push(`up to ${dateStr}`)
        }
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

  /**
   * Get the empty state element
   */
  public getElement(): HTMLElement {
    return this.emptyStateEl
  }
}
