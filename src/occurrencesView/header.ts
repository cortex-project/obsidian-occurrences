import { FileSelector, SearchBar } from "@/components"
import { App, Component, setIcon, setTooltip } from "obsidian"

export interface SearchFilters {
  search: boolean
  searchQuery: string
  currentFile: boolean
  selectedFile: string | null
  inbox: boolean
}

export class Header extends Component {
  private headerEl: HTMLElement
  private fileSelectorButton: HTMLElement
  private searchButton: HTMLElement
  private inboxButton: HTMLElement
  private searchBar: SearchBar
  private fileSelector: FileSelector
  private onFilterChange: (filters: SearchFilters) => void
  private app: App
  private filters: SearchFilters = {
    search: false,
    searchQuery: "",
    currentFile: false,
    selectedFile: null,
    inbox: false,
  }

  constructor(
    container: HTMLElement,
    app: App,
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

    this.updateButtonStates()
  }

  /**
   * Toggle a specific filter
   */
  private toggleFilter(
    filterKey: Exclude<keyof SearchFilters, "searchQuery" | "selectedFile">
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
    if (filterKey === "currentFile") {
      if (this.filters.currentFile) {
        this.fileSelector.show()
      } else {
        this.fileSelector.hide()
        this.fileSelector.clearInput()
        this.filters.selectedFile = null
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
    if (this.filters.currentFile) {
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

  public getElement(): HTMLElement {
    return this.headerEl
  }
}
