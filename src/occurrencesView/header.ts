import { SearchBar, FileSelector } from "@/components"
import { Component, setIcon, setTooltip, TFile } from "obsidian"

export interface SearchFilters {
  search: boolean
  searchQuery: string
  fileSelector: boolean
  selectedFilePath: string | null
  isCurrentFileMode: boolean
  inbox: boolean
}

export class Header extends Component {
  private app: any
  private headerEl: HTMLElement
  private fileSelectorButton: HTMLElement
  private searchButton: HTMLElement
  private inboxButton: HTMLElement
  private searchBar: SearchBar
  private fileSelector: FileSelector
  private onFilterChange: (filters: SearchFilters) => void
  private filters: SearchFilters = {
    search: false,
    searchQuery: "",
    fileSelector: false,
    selectedFilePath: null,
    isCurrentFileMode: false,
    inbox: false,
  }

  constructor(
    app: any,
    container: HTMLElement,
    onFilterChange: (filters: SearchFilters) => void
  ) {
    super()
    this.app = app
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

    this.searchButton.addEventListener("click", () => {
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

    // File selector button (replaces current file button)
    this.fileSelectorButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "file-selector" },
    })
    setIcon(this.fileSelectorButton, "link")
    setTooltip(this.fileSelectorButton, "Toggle File Selector")

    this.fileSelectorButton.addEventListener("click", () => {
      this.toggleFilter("fileSelector")
    })

    // Create file selector component
    this.fileSelector = new FileSelector(
      this.app,
      navHeader,
      (filePath: string | null, isCurrentFile: boolean) => {
        this.filters.selectedFilePath = filePath
        this.filters.isCurrentFileMode = isCurrentFile
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Linking to...",
        debounceMs: 200,
      }
    )
    this.addChild(this.fileSelector)

    // Inbox button
    this.inboxButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "inbox" },
    })
    setIcon(this.inboxButton, "inbox")
    setTooltip(this.inboxButton, "Toggle Inbox")

    this.inboxButton.addEventListener("click", () => {
      this.toggleFilter("inbox")
    })

    this.updateButtonStates()
  }

  /**
   * Toggle a specific filter
   */
  private toggleFilter(
    filterKey: Exclude<keyof SearchFilters, "searchQuery" | "selectedFilePath" | "isCurrentFileMode">
  ): void {
    this.filters[filterKey] = !this.filters[filterKey]

    // Handle search bar visibility
    if (filterKey === "search") {
      if (this.filters.search) {
        this.searchBar.show()
      } else {
        this.searchBar.hide()
        this.filters.searchQuery = ""
      }
    }

    // Handle file selector visibility
    if (filterKey === "fileSelector") {
      if (this.filters.fileSelector) {
        this.fileSelector.show()
      } else {
        this.fileSelector.hide()
        this.filters.selectedFilePath = null
        this.filters.isCurrentFileMode = false
      }
    }

    this.updateButtonStates()
    this.onFilterChange({ ...this.filters })
  }

  /**
   * Update button visual states based on current filters
   */
  private updateButtonStates(): void {
    // Update search button
    if (this.filters.search) {
      this.searchButton.addClass("is-active")
    } else {
      this.searchButton.removeClass("is-active")
    }

    // Update file selector button
    if (this.filters.fileSelector) {
      this.fileSelectorButton.addClass("is-active")
    } else {
      this.fileSelectorButton.removeClass("is-active")
    }

    // Update inbox button
    if (this.filters.inbox) {
      this.inboxButton.addClass("is-active")
    } else {
      this.inboxButton.removeClass("is-active")
    }
  }

  /**
   * Handle active file changes when current file mode is active
   */
  public onActiveFileChange(): void {
    if (this.filters.isCurrentFileMode && this.filters.fileSelector) {
      // The FileSelector component will handle this automatically
      // via its active-leaf-change event listener
    }
  }

  /**
   * Get current filter state
   */
  public getFilters(): SearchFilters {
    return { ...this.filters }
  }

  public getElement(): HTMLElement {
    return this.headerEl
  }
}