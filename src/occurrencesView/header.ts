import { DateFilter, FileSelector, SearchBar, TagSelector } from "@/components"
import { OccurrenceStore } from "@/occurrenceStore"
import { App, Component, setIcon, setTooltip } from "obsidian"

export interface SearchFilters {
  search: boolean
  searchQuery: string
  currentFile: boolean
  selectedFile: string | null
  inbox: boolean
  tags: boolean
  selectedTags: string[]
  dateFilter: boolean
  dateFrom: Date | null
  dateTo: Date | null
}

export interface SearchMetadata {
  participants: string[]
  locations: string[]
}

export class Header extends Component {
  private headerEl: HTMLElement
  private fileSelectorButton: HTMLElement
  private searchButton: HTMLElement
  private tagButton: HTMLElement
  private inboxButton: HTMLElement
  private dateButton: HTMLElement
  private searchBar: SearchBar
  private fileSelector: FileSelector
  private tagSelector: TagSelector
  private dateFilter: DateFilter
  private summaryEl: HTMLElement
  private onFilterChange: (filters: SearchFilters) => void
  private app: App
  private occurrenceStore: OccurrenceStore
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

  constructor(
    container: HTMLElement,
    app: App,
    occurrenceStore: OccurrenceStore,
    onFilterChange: (filters: SearchFilters) => void
  ) {
    super()
    this.app = app
    this.occurrenceStore = occurrenceStore
    this.headerEl = container.createEl("div", {
      cls: "occurrences-view-header",
    })
    this.onFilterChange = onFilterChange
    this.render()
  }

  private render(): void {
    // Create nav-header wrapper (matches built-in tags view structure)
    const navHeader = this.headerEl.createEl("div", {
      cls: "nav-header",
    })

    const buttonsContainer = navHeader.createEl("div", {
      cls: "nav-buttons-container",
    })

    // Search button
    this.searchButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "search" },
    })
    setIcon(this.searchButton, "search")
    setTooltip(this.searchButton, "Toggle Search")

    this.registerDomEvent(this.searchButton, "click", () => {
      this.toggleFilter("search")
    })

    // Create search bar component - pass navHeader as container
    this.searchBar = new SearchBar(
      navHeader,
      (query: string) => {
        this.filters.searchQuery = query
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Search occurrences...",
        debounceMs: 300,
      }
    )
    this.addChild(this.searchBar)

    // File selector button
    this.fileSelectorButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "file-selector" },
    })
    setIcon(this.fileSelectorButton, "link")
    setTooltip(this.fileSelectorButton, "Toggle File Selector")

    this.registerDomEvent(this.fileSelectorButton, "click", () => {
      this.toggleFilter("currentFile")
    })

    // Create file selector component
    this.fileSelector = new FileSelector(
      navHeader,
      this.app,
      (filePath: string | null, isCurrentFile: boolean) => {
        this.filters.selectedFile = filePath
        this.filters.currentFile = isCurrentFile
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Linking to...",
        debounceMs: 300,
      }
    )
    this.addChild(this.fileSelector)

    // Tag button
    this.tagButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "tag-selector" },
    })
    setIcon(this.tagButton, "tags")
    setTooltip(this.tagButton, "Toggle Tag Filter")

    this.registerDomEvent(this.tagButton, "click", () => {
      this.toggleFilter("tags")
    })

    // Create tag selector component
    this.tagSelector = new TagSelector(
      navHeader,
      this.occurrenceStore,
      (tags: string[]) => {
        this.filters.selectedTags = tags
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Has the tag...",
        debounceMs: 300,
      }
    )
    this.addChild(this.tagSelector)

    // Date filter button
    this.dateButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "date-filter" },
    })
    setIcon(this.dateButton, "calendar")
    setTooltip(this.dateButton, "Toggle Date Filter")

    this.registerDomEvent(this.dateButton, "click", () => {
      this.toggleFilter("dateFilter")
    })

    // Create date filter component
    this.dateFilter = new DateFilter(
      navHeader,
      (dateFrom: Date | null, dateTo: Date | null) => {
        this.filters.dateFrom = dateFrom
        this.filters.dateTo = dateTo
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Filter by date...",
      }
    )
    this.addChild(this.dateFilter)

    // Inbox button
    this.inboxButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "inbox" },
    })
    setIcon(this.inboxButton, "inbox")
    setTooltip(this.inboxButton, "Toggle Inbox")

    this.registerDomEvent(this.inboxButton, "click", () => {
      this.toggleFilter("inbox")
    })

    // Create summary element
    this.summaryEl = this.headerEl.createEl("div", {
      cls: "occurrences-summary",
    })
    this.summaryEl.hide() // Initially hidden

    this.updateButtonStates()
  }

  /**
   * Toggle a specific filter
   */
  private toggleFilter(
    filterKey: Exclude<
      keyof SearchFilters,
      "searchQuery" | "selectedFile" | "selectedTags" | "dateFrom" | "dateTo"
    >
  ): void {
    // Handle search bar visibility
    if (filterKey === "search") {
      if (this.searchBar.isVisible()) {
        this.searchBar.hide()
        this.filters.searchQuery = ""
      } else {
        this.searchBar.show()
      }
    }

    // Handle file selector visibility
    if (filterKey === "currentFile") {
      if (this.fileSelector.isVisible()) {
        this.fileSelector.hide()
        this.fileSelector.clearInput()
        this.filters.selectedFile = null
      } else {
        this.fileSelector.show()
      }
    }

    // Handle tag selector visibility
    if (filterKey === "tags") {
      if (this.tagSelector.isVisible()) {
        this.tagSelector.hide()
        this.tagSelector.clearInput()
        this.filters.selectedTags = []
      } else {
        this.tagSelector.show()
      }
    }

    // Handle date filter visibility
    if (filterKey === "dateFilter") {
      if (this.dateFilter.isVisible()) {
        this.dateFilter.hide()
        this.dateFilter.clearInput()
        this.filters.dateFrom = null
        this.filters.dateTo = null
      } else {
        this.dateFilter.show()
      }
    }

    // Handle inbox toggle (no visible component)
    if (filterKey === "inbox") {
      this.filters.inbox = !this.filters.inbox
    }

    // Update the filters state to match actual component visibility
    this.filters.search = this.searchBar.isVisible()
    this.filters.currentFile = this.fileSelector.isVisible()
    this.filters.tags = this.tagSelector.isVisible()
    this.filters.dateFilter = this.dateFilter.isVisible()

    this.updateButtonStates()
    this.onFilterChange({ ...this.filters })
  }

  /**
   * Update button visual states based on actual component visibility
   */
  private updateButtonStates(): void {
    // Update search button based on actual search bar visibility
    if (this.searchBar.isVisible()) {
      this.searchButton.addClass("is-active")
    } else {
      this.searchButton.removeClass("is-active")
    }

    // Update file selector button based on actual file selector visibility
    if (this.fileSelector.isVisible()) {
      this.fileSelectorButton.addClass("is-active")
    } else {
      this.fileSelectorButton.removeClass("is-active")
    }

    // Update tag button based on actual tag selector visibility
    if (this.tagSelector.isVisible()) {
      this.tagButton.addClass("is-active")
    } else {
      this.tagButton.removeClass("is-active")
    }

    // Update date button based on actual date filter visibility
    if (this.dateFilter.isVisible()) {
      this.dateButton.addClass("is-active")
    } else {
      this.dateButton.removeClass("is-active")
    }

    // Inbox button doesn't have a visible component, so keep current logic
    if (this.filters.inbox) {
      this.inboxButton.addClass("is-active")
    } else {
      this.inboxButton.removeClass("is-active")
    }
  }

  /**
   * Get current filter state
   */
  public getFilters(): SearchFilters {
    return { ...this.filters }
  }

  /**
   * Update active file in file selector
   */
  public updateActiveFile(): void {
    this.fileSelector.updateActiveFile()
  }

  /**
   * Update the summary display with new data
   */
  public updateSummary(
    totalCount: number,
    metadata: SearchMetadata,
    pagination?: { offset: number; limit: number }
  ): void {
    this.summaryEl.empty()

    if (totalCount === 0) {
      this.summaryEl.hide()
      return
    }

    this.summaryEl.show()

    // Create main summary line
    const summaryLine = this.summaryEl.createEl("div", {
      cls: "summary-line",
    })

    // Create count container
    const countContainer = summaryLine.createEl("div", {
      cls: "summary-count-container",
    })

    // Main count text
    const countText = `${totalCount} Occurrence${
      totalCount === 1 ? "" : "s"
    } found`

    countContainer.createEl("span", {
      cls: "summary-count",
      text: countText,
    })

    // Add pagination info if showing subset
    if (pagination && pagination.offset > 0) {
      const showingCount = Math.min(
        pagination.limit,
        totalCount - pagination.offset
      )
      countContainer.createEl("span", {
        cls: "summary-pagination",
        text: `showing ${showingCount} results`,
      })
    } else if (pagination && pagination.limit < totalCount) {
      countContainer.createEl("span", {
        cls: "summary-pagination",
        text: `showing ${pagination.limit} results`,
      })
    }

    // Add details expander on the right
    const detailsElement = summaryLine.createEl("span", {
      cls: "summary-details-text",
    })

    const detailsText = detailsElement.createEl("span", {
      cls: "details-text",
      text: "details",
    })

    const caret = detailsElement.createEl("span", {
      cls: "details-caret",
    })
    setIcon(caret, "chevron-down")

    // Create expandable details section
    const detailsSection = this.summaryEl.createEl("div", {
      cls: "summary-details",
    })
    detailsSection.hide()

    // Participants row
    if (metadata.participants.length > 0) {
      const participantsRow = detailsSection.createEl("div", {
        cls: "details-row",
      })

      participantsRow.createEl("span", {
        cls: "details-label",
        text: "Participants:",
      })

      participantsRow.createEl("span", {
        cls: "details-value",
        text: metadata.participants.join(", "),
      })
    }

    // Locations row
    if (metadata.locations.length > 0) {
      const locationsRow = detailsSection.createEl("div", {
        cls: "details-row",
      })

      locationsRow.createEl("span", {
        cls: "details-label",
        text: "Locations:",
      })

      locationsRow.createEl("span", {
        cls: "details-value",
        text: metadata.locations.join(", "),
      })
    }

    // Handle details toggle
    this.registerDomEvent(detailsElement, "click", () => {
      if (detailsSection.isShown()) {
        detailsSection.hide()
        setIcon(caret, "chevron-down")
      } else {
        detailsSection.show()
        setIcon(caret, "chevron-up")
      }
    })
  }

  public getElement(): HTMLElement {
    return this.headerEl
  }
}
