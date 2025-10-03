import { Component, setIcon, setTooltip } from "obsidian"

export interface SearchFilters {
  search: boolean
  currentFile: boolean
  inbox: boolean
}

export class Header extends Component {
  private headerEl: HTMLElement
  private currentFileButton: HTMLElement
  private searchButton: HTMLElement
  private inboxButton: HTMLElement
  private onFilterChange: (filters: SearchFilters) => void
  private filters: SearchFilters = {
    search: false,
    currentFile: false,
    inbox: false,
  }

  constructor(
    container: HTMLElement,
    onFilterChange: (filters: SearchFilters) => void
  ) {
    super()
    this.headerEl = container.createEl("div", {
      cls: "occurrences-view-header",
    })
    this.onFilterChange = onFilterChange
    this.render()
  }

  private render(): void {
    const buttonsContainer = this.headerEl.createEl("div", {
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
   * Toggle a specific filter
   */
  private toggleFilter(filterKey: keyof SearchFilters): void {
    this.filters[filterKey] = !this.filters[filterKey]
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
