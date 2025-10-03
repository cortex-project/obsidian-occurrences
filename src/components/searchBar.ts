import { Component, debounce } from "obsidian"

export interface SearchBarOptions {
  placeholder?: string
  debounceMs?: number
}

export class SearchBar extends Component {
  private searchContainer: HTMLElement
  private searchInputContainer: HTMLElement
  private searchInput: HTMLInputElement
  private searchClear: HTMLElement
  private onSearchChange: (query: string) => void
  private debouncedSearchChange: (query: string) => void
  private options: SearchBarOptions

  constructor(
    container: HTMLElement,
    onSearchChange: (query: string) => void,
    options: SearchBarOptions = {}
  ) {
    super()
    this.options = {
      placeholder: "Search...",
      debounceMs: 300,
      ...options,
    }
    this.onSearchChange = onSearchChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.onSearchChange(query)
    }, this.options.debounceMs!)
    this.render(container)
  }

  private render(container: HTMLElement): void {
    // Create search container
    this.searchContainer = container.createEl("div", {
      cls: "search-container",
    })
    this.searchContainer.style.display = "none"

    // Create search input container
    this.searchInputContainer = this.searchContainer.createEl("div", {
      cls: "search-input-container",
    })

    // Create search input
    this.searchInput = this.searchInputContainer.createEl("input", {
      type: "search",
      placeholder: this.options.placeholder!,
      attr: {
        id: "search-input",
        enterkeyhint: "search",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.searchInput.classList.add("search-input")

    // Create clear button (following Obsidian's structure)
    this.searchClear = this.searchInputContainer.createEl("div", {
      cls: "search-input-clear-button",
      attr: {
        "aria-label": "Clear search",
      },
    })
    this.searchClear.style.display = "none"

    // Add input event listener
    this.searchInput.addEventListener("input", e => {
      const target = e.target as HTMLInputElement
      this.updateClearButton(target.value)
      this.debouncedSearchChange(target.value)
    })

    // Add clear button event listener
    this.searchClear.addEventListener("click", () => {
      this.searchInput.value = ""
      this.searchClear.style.display = "none"
      this.debouncedSearchChange("")
    })
  }

  /**
   * Update clear button visibility based on input value
   */
  private updateClearButton(value: string): void {
    this.searchClear.style.display = value.length > 0 ? "flex" : "none"
  }

  /**
   * Show the search bar
   */
  public show(): void {
    this.searchContainer.style.display = "block"
    this.searchInput.focus()
  }

  /**
   * Hide the search bar
   */
  public hide(): void {
    this.searchContainer.style.display = "none"
    this.searchInput.value = ""
    this.searchClear.style.display = "none"
  }

  /**
   * Get the current search query
   */
  public getValue(): string {
    return this.searchInput.value
  }

  /**
   * Set the search query programmatically
   */
  public setValue(value: string): void {
    this.searchInput.value = value
    this.updateClearButton(value)
    this.debouncedSearchChange(value)
  }

  /**
   * Check if the search bar is visible
   */
  public isVisible(): boolean {
    return this.searchContainer.style.display === "block"
  }

  public getElement(): HTMLElement {
    return this.searchContainer
  }
}
