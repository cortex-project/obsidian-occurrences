import { SearchBar, FileSelector, FileSelection } from "@/components"
import { Component, setIcon, setTooltip, TFile } from "obsidian"

export interface SearchFilters {
  search: boolean
  searchQuery: string
  currentFile: boolean
  inbox: boolean
  linksTo: boolean
  linksToFile?: TFile | null
  linksToIsCurrentFile: boolean
}

export class Header extends Component {
  private app: any
  private headerEl: HTMLElement
  private currentFileButton: HTMLElement
  private searchButton: HTMLElement
  private inboxButton: HTMLElement
  private linksToButton: HTMLElement
  private searchBar: SearchBar
  private fileSelector: FileSelector
  private onFilterChange: (filters: SearchFilters) => void
  private filters: SearchFilters = {
    search: false,
    searchQuery: "",
    currentFile: false,
    inbox: false,
    linksTo: false,
    linksToFile: null,
    linksToIsCurrentFile: false,
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
    this.setupActiveFileListener()
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

    // Links To button (replaces crosshair/current file button)
    this.linksToButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "links-to" },
    })
    setIcon(this.linksToButton, "link")
    setTooltip(this.linksToButton, "Toggle Links To Filter")

    this.linksToButton.addEventListener("click", () => {
      this.toggleFilter("linksTo")
    })

    // Create file selector component - pass navHeader as container
    this.fileSelector = new FileSelector(
      this.app,
      navHeader,
      (selection: FileSelection) => {
        this.filters.linksToFile = selection.file || null
        this.filters.linksToIsCurrentFile = selection.isCurrentFile
        this.onFilterChange({ ...this.filters })
      },
      {
        placeholder: "Linking to...",
        debounceMs: 300,
      }
    )
    this.addChild(this.fileSelector)

    // Current file button
    this.currentFileButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "current-file" },
    })
    setIcon(this.currentFileButton, "crosshair")
    setTooltip(this.currentFileButton, "Toggle Current File Filter")

    this.currentFileButton.addEventListener("click", () => {
      this.toggleFilter("currentFile")
    })

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
   * Setup active file change listener for when linksTo is in current file mode
   */
  private setupActiveFileListener(): void {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        const activeFile = this.app.workspace.getActiveFile()
        this.fileSelector.onActiveFileChange(activeFile)
        
        // If current file filter is active, update it
        if (this.filters.currentFile) {
          this.onActiveFileChange()
        }
      })
    )
  }

  /**
   * Handle active file changes for current file filter
   */
  private onActiveFileChange(): void {
    // Trigger filter change to update occurrences list
    this.onFilterChange({ ...this.filters })
  }

  /**
   * Toggle a specific filter
   */
  private toggleFilter(
    filterKey: Exclude<keyof SearchFilters, "searchQuery" | "linksToFile" | "linksToIsCurrentFile">
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
    if (filterKey === "linksTo") {
      if (this.filters.linksTo) {
        this.fileSelector.show()
      } else {
        this.fileSelector.hide()
        this.filters.linksToFile = null
        this.filters.linksToIsCurrentFile = false
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

    // Update links to button
    if (this.filters.linksTo) {
      this.linksToButton.addClass("is-active")
    } else {
      this.linksToButton.removeClass("is-active")
    }

    // Update current file button
    if (this.filters.currentFile) {
      this.currentFileButton.addClass("is-active")
    } else {
      this.currentFileButton.removeClass("is-active")
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