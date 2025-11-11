import { DateFilter, FileSelector, SearchBar, TagSelector } from "@/components"
import { OccurrenceStore } from "@/occurrenceStore"
import { App, Component, setIcon, setTooltip } from "obsidian"
import { FilterService } from "../services/filterService"

export class FilterControls extends Component {
  private buttonsContainer: HTMLElement
  private fileSelectorButton: HTMLElement
  private searchButton: HTMLElement
  private tagButton: HTMLElement
  private inboxButton: HTMLElement
  private dateButton: HTMLElement
  private sortButton: HTMLElement
  private searchBar: SearchBar
  private fileSelector: FileSelector
  private tagSelector: TagSelector
  private dateFilter: DateFilter
  private filterService: FilterService
  private app: App

  constructor(
    container: HTMLElement,
    app: App,
    occurrenceStore: OccurrenceStore,
    filterService: FilterService
  ) {
    super()
    this.app = app
    this.filterService = filterService

    // Create buttons container
    this.buttonsContainer = container.createEl("div", {
      cls: "nav-buttons-container",
    })

    this.createFilterButtons()
    this.createFilterComponents(container, occurrenceStore)
    this.initializeComponentVisibility()
  }

  /**
   * Create all filter buttons
   */
  private createFilterButtons(): void {
    // Search button
    this.searchButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "search" },
    })
    setIcon(this.searchButton, "search")
    setTooltip(this.searchButton, "Toggle Search")

    this.registerDomEvent(this.searchButton, "click", () => {
      this.toggleFilter("search")
    })

    // File selector button
    this.fileSelectorButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "file-selector" },
    })
    setIcon(this.fileSelectorButton, "link")
    setTooltip(this.fileSelectorButton, "Toggle File Selector")

    this.registerDomEvent(this.fileSelectorButton, "click", () => {
      this.toggleFilter("currentFile")
    })

    // Tag button
    this.tagButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "tag-selector" },
    })
    setIcon(this.tagButton, "tags")
    setTooltip(this.tagButton, "Toggle Tag Filter")

    this.registerDomEvent(this.tagButton, "click", () => {
      this.toggleFilter("tags")
    })

    // Date filter button
    this.dateButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "date-filter" },
    })
    setIcon(this.dateButton, "calendar")
    setTooltip(this.dateButton, "Toggle Date Filter")

    this.registerDomEvent(this.dateButton, "click", () => {
      this.toggleFilter("dateFilter")
    })

    // Inbox button
    this.inboxButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "inbox" },
    })
    setIcon(this.inboxButton, "inbox")
    setTooltip(this.inboxButton, "Toggle Inbox")

    this.registerDomEvent(this.inboxButton, "click", () => {
      this.toggleFilter("inbox")
    })

    // Sort button
    this.sortButton = this.buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "sort", role: "button", tabindex: "0" },
    })
    this.updateSortButton()

    this.registerDomEvent(this.sortButton, "click", () => {
      this.filterService.toggleSortOrder()
      this.updateSortButton()
    })

    // Add keyboard support
    this.registerDomEvent(this.sortButton, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        this.filterService.toggleSortOrder()
        this.updateSortButton()
      }
    })
  }

  /**
   * Create all filter components
   */
  private createFilterComponents(
    container: HTMLElement,
    occurrenceStore: OccurrenceStore
  ): void {
    // Create search bar component
    this.searchBar = new SearchBar(
      container,
      (query: string) => {
        this.filterService.updateSearchQuery(query)
      },
      {
        placeholder: "Search occurrences...",
        debounceMs: 300,
      }
    )
    this.addChild(this.searchBar)

    // Create file selector component
    this.fileSelector = new FileSelector(
      container,
      this.app,
      (filePath: string | null, isCurrentFile: boolean) => {
        this.filterService.updateFileSelection(filePath, isCurrentFile)
      },
      {
        placeholder: "Linking to...",
        debounceMs: 300,
      }
    )
    this.addChild(this.fileSelector)

    // Create tag selector component
    this.tagSelector = new TagSelector(
      container,
      occurrenceStore,
      (tags: string[]) => {
        this.filterService.updateTagSelection(tags)
      },
      {
        placeholder: "Has the tag...",
        debounceMs: 300,
      }
    )
    this.addChild(this.tagSelector)

    // Create date filter component
    this.dateFilter = new DateFilter(
      container,
      (dateFrom: Date | null, dateTo: Date | null) => {
        this.filterService.updateDateFilter(dateFrom, dateTo)
      },
      {
        placeholder: "Filter by date...",
      }
    )
    this.addChild(this.dateFilter)
  }

  /**
   * Initialize component visibility based on current filter state
   */
  private initializeComponentVisibility(): void {
    const filters = this.filterService.getFilters()

    // Set initial visibility based on filter state
    if (filters.search) {
      this.searchBar.show()
    } else {
      this.searchBar.hide()
    }

    if (filters.currentFile) {
      this.fileSelector.show()
    } else {
      this.fileSelector.hide()
    }

    if (filters.tags) {
      this.tagSelector.show()
    } else {
      this.tagSelector.hide()
    }

    if (filters.dateFilter) {
      this.dateFilter.show()
    } else {
      this.dateFilter.hide()
    }

    // Update button states to match
    this.updateButtonStates()
  }

  /**
   * Toggle a specific filter
   */
  private toggleFilter(
    filterKey: "search" | "currentFile" | "tags" | "dateFilter" | "inbox"
  ): void {
    // Handle search bar visibility
    if (filterKey === "search") {
      this.filterService.toggleFilter("search")
      const filters = this.filterService.getFilters()
      if (filters.search) {
        this.searchBar.show()
      } else {
        this.searchBar.hide()
        this.filterService.updateSearchQuery("")
      }
    }

    // Handle file selector visibility
    if (filterKey === "currentFile") {
      this.filterService.toggleFilter("currentFile")
      const filters = this.filterService.getFilters()
      if (filters.currentFile) {
        this.fileSelector.show()
      } else {
        this.fileSelector.hide()
        this.fileSelector.clearInput()
        this.filterService.updateFileSelection(null, false)
      }
    }

    // Handle tag selector visibility
    if (filterKey === "tags") {
      this.filterService.toggleFilter("tags")
      const filters = this.filterService.getFilters()
      if (filters.tags) {
        this.tagSelector.show()
      } else {
        this.tagSelector.hide()
        this.tagSelector.clearInput()
        this.filterService.updateTagSelection([])
      }
    }

    // Handle date filter visibility
    if (filterKey === "dateFilter") {
      this.filterService.toggleFilter("dateFilter")
      const filters = this.filterService.getFilters()
      if (filters.dateFilter) {
        this.dateFilter.show()
      } else {
        this.dateFilter.hide()
        this.dateFilter.clearInput()
        this.filterService.updateDateFilter(null, null)
      }
    }

    // Handle inbox toggle (no visible component)
    if (filterKey === "inbox") {
      this.filterService.toggleFilter("inbox")
    }

    this.updateButtonStates()
  }

  /**
   * Update button visual states based on actual filter state
   */
  private updateButtonStates(): void {
    const filters = this.filterService.getFilters()

    // Update search button based on filter state
    if (filters.search) {
      this.searchButton.addClass("is-active")
    } else {
      this.searchButton.removeClass("is-active")
    }

    // Update file selector button based on filter state
    if (filters.currentFile) {
      this.fileSelectorButton.addClass("is-active")
    } else {
      this.fileSelectorButton.removeClass("is-active")
    }

    // Update tag button based on filter state
    if (filters.tags) {
      this.tagButton.addClass("is-active")
    } else {
      this.tagButton.removeClass("is-active")
    }

    // Update date button based on filter state
    if (filters.dateFilter) {
      this.dateButton.addClass("is-active")
    } else {
      this.dateButton.removeClass("is-active")
    }

    // Inbox button based on filter state
    if (filters.inbox) {
      this.inboxButton.addClass("is-active")
    } else {
      this.inboxButton.removeClass("is-active")
    }

    // Update sort button (always visible, shows current state)
    this.updateSortButton()
  }

  /**
   * Update sort button icon and tooltip based on current sort order
   */
  private updateSortButton(): void {
    const filters = this.filterService.getFilters()
    const sortOrder = filters.sortOrder

    // Set icon based on current sort order
    const icon =
      sortOrder === "asc" ? "calendar-arrow-up" : "calendar-arrow-down"
    setIcon(this.sortButton, icon)

    // Tooltip describes what it will change TO, not current state
    const tooltip =
      sortOrder === "asc"
        ? "Sort Descending (Newest First)"
        : "Sort Ascending (Oldest First)"
    setTooltip(this.sortButton, tooltip)
    this.sortButton.setAttribute("aria-label", tooltip)
  }

  /**
   * Update active file in file selector
   */
  public updateActiveFile(): void {
    this.fileSelector.updateActiveFile()
  }

  /**
   * Sync UI state with current filter state
   * This should be called when filters are reset externally
   */
  public syncWithFilterState(): void {
    const filters = this.filterService.getFilters()

    // Update component visibility
    if (filters.search) {
      this.searchBar.show()
    } else {
      this.searchBar.hide()
    }

    if (filters.currentFile) {
      this.fileSelector.show()
    } else {
      this.fileSelector.hide()
      this.fileSelector.clearInput()
    }

    if (filters.tags) {
      this.tagSelector.show()
    } else {
      this.tagSelector.hide()
      this.tagSelector.clearInput()
    }

    if (filters.dateFilter) {
      this.dateFilter.show()
    } else {
      this.dateFilter.hide()
      this.dateFilter.clearInput()
    }

    // Update button states
    this.updateButtonStates()
  }

  /**
   * Get the buttons container element
   */
  public getButtonsContainer(): HTMLElement {
    return this.buttonsContainer
  }
}
