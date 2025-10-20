import { SearchFilters, SearchOptions } from "../types"

export class FilterService {
  private filters: SearchFilters = {
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

  private onFilterChange?: (filters: SearchFilters) => void

  constructor(onFilterChange?: (filters: SearchFilters) => void) {
    this.onFilterChange = onFilterChange
  }

  /**
   * Get current filter state
   */
  public getFilters(): SearchFilters {
    return { ...this.filters }
  }

  /**
   * Update filters and notify listeners
   */
  public updateFilters(newFilters: Partial<SearchFilters>): void {
    this.filters = { ...this.filters, ...newFilters }
    this.onFilterChange?.(this.getFilters())
  }

  /**
   * Update search query
   */
  public updateSearchQuery(query: string): void {
    this.updateFilters({ searchQuery: query })
  }

  /**
   * Update file selection
   */
  public updateFileSelection(
    filePath: string | null,
    isCurrentFile: boolean
  ): void {
    this.updateFilters({
      selectedFile: filePath,
      currentFile: isCurrentFile,
    })
  }

  /**
   * Update tag selection
   */
  public updateTagSelection(tags: string[]): void {
    this.updateFilters({ selectedTags: tags })
  }

  /**
   * Update date filter
   */
  public updateDateFilter(dateFrom: Date | null, dateTo: Date | null): void {
    this.updateFilters({
      dateFrom,
      dateTo,
    })
  }

  /**
   * Toggle a boolean filter
   */
  public toggleFilter(
    filterKey: keyof Pick<
      SearchFilters,
      "search" | "currentFile" | "tags" | "dateFilter" | "inbox"
    >
  ): void {
    const currentValue = this.filters[filterKey]
    this.updateFilters({ [filterKey]: !currentValue })
  }

  /**
   * Build search options from current filters
   */
  public buildSearchOptions(): SearchOptions {
    const searchOptions: SearchOptions = {}

    // Apply search query if search filter is active
    if (this.filters.search && this.filters.searchQuery) {
      searchOptions.query = this.filters.searchQuery
    }

    // Apply file filter if active (either current file mode or manual file selection)
    if (this.filters.currentFile || this.filters.selectedFile) {
      searchOptions.linksTo = this.filters.selectedFile || undefined
    }

    // Apply inbox filter if active
    if (this.filters.inbox) {
      searchOptions.toProcess = true
    }

    // Apply tag filter if active
    if (this.filters.tags && this.filters.selectedTags.length > 0) {
      // Remove # prefix from tags before searching
      searchOptions.tags = this.filters.selectedTags.map(tag =>
        tag.startsWith("#") ? tag.slice(1) : tag
      )
    }

    // Apply date filter if active
    if (this.filters.dateFilter) {
      if (this.filters.dateFrom) {
        searchOptions.dateFrom = this.filters.dateFrom
      }
      if (this.filters.dateTo) {
        searchOptions.dateTo = this.filters.dateTo
      }
    }

    return searchOptions
  }

  /**
   * Check if an occurrence matches current filters
   */
  public matchesCurrentFilters(occurrence: any, occurrenceStore: any): boolean {
    // Apply file filter if active (either current file mode or manual file selection)
    if (this.filters.currentFile || this.filters.selectedFile) {
      const searchResult = occurrenceStore.search({
        linksTo: this.filters.selectedFile || undefined,
      })
      if (
        !searchResult.items.some(
          (item: any) => item.file.path === occurrence.file.path
        )
      ) {
        return false
      }
    }

    // Apply inbox filter if active
    if (this.filters.inbox) {
      if (!occurrence.properties.toProcess) {
        return false
      }
    }

    // Apply tag filter if active
    if (this.filters.tags && this.filters.selectedTags.length > 0) {
      const occurrenceTags = occurrence.properties.tags || []
      // Remove # prefix from selected tags for comparison
      const normalizedSelectedTags = this.filters.selectedTags.map(tag =>
        tag.startsWith("#") ? tag.slice(1) : tag
      )
      const hasMatchingTag = normalizedSelectedTags.some(selectedTag =>
        occurrenceTags.includes(selectedTag)
      )
      if (!hasMatchingTag) {
        return false
      }
    }

    return true
  }

  /**
   * Reset all filters to default state
   */
  public resetFilters(): void {
    this.filters = {
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
    this.onFilterChange?.(this.getFilters())
  }
}
