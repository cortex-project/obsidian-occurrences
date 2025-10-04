import { SearchBar, FileSelector, FileSelectorResult } from "@/components"
import { Component, setIcon, setTooltip, TFile, App } from "obsidian"

export interface SearchFilters {
  search: boolean
  searchQuery: string
  fileSelector: boolean
  selectedFile: FileSelectorResult
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
  private onActiveFileChange: () => void
  private app: App
  private filters: SearchFilters = {
    search: false,
    searchQuery: "",
    fileSelector: false,
    selectedFile: { type: "file", file: null },
    inbox: false,
  }

  constructor(
    container: HTMLElement,
    app: App,
    onFilterChange: (filters: SearchFilters) => void,
    onActiveFileChange: () => void
  ) {
    super()
    this.app = app
    this.headerEl = container.createEl("div", {
      cls: "occurrences-view-header",
    })
    this.onFilterChange = onFilterChange
    this.onActiveFileChange = onActiveFileChange
    this.render()
    this.registerEvents()
  }

  private registerEvents(): void {
    // Listen for active file changes when in current file mode
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const activeFile = this.app.workspace.getActiveFile()
        this.fileSelector.setCurrentFile(activeFile)
        
        // If we're in current file mode, trigger the callback
        if (this.filters.selectedFile.type === "current") {
          this.onActiveFileChange()
        }
      })
    )
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
      navHeader,
      this.app,
      (result: FileSelectorResult) => {
        this.filters.selectedFile = result
        this.onFilterChange({ ...this.filters })
        
        // If current file mode is selected, trigger the callback
        if (result.type === "current") {
          this.onActiveFileChange()
        }
      },
      {
        placeholder: "Linking to...",
        debounceMs: 300,
      }
    )
    this.addChild(this.fileSelector)

    // Set initial current file
    const activeFile = this.app.workspace.getActiveFile()
    this.fileSelector.setCurrentFile(activeFile)

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
    if (filterKey === "fileSelector") {
      if (this.filters.fileSelector) {
        this.fileSelector.show()
      } else {
        this.fileSelector.hide()
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
   * Get current filter state
   */
  public getFilters(): SearchFilters {
    return { ...this.filters }
  }

  public getElement(): HTMLElement {
    return this.headerEl
  }
}