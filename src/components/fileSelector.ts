import { Component, debounce, setIcon, setTooltip, TFile } from "obsidian"

export interface FileSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export interface FileSuggestion {
  file: TFile
  displayName: string
  fullPath: string
}

export class FileSelector extends Component {
  private fileContainer: HTMLElement
  private fileInputContainer: HTMLElement
  private fileInput: HTMLInputElement
  private fileClear: HTMLElement
  private targetButton: HTMLElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private onFileChange: (
    filePath: string | null,
    isCurrentFile: boolean
  ) => void
  private debouncedSearchChange: (query: string) => void
  private options: FileSelectorOptions
  private app: any
  private currentActiveFile: TFile | null = null
  private selectedFile: TFile | null = null
  private isCurrentFileMode: boolean = false
  private suggestions: FileSuggestion[] = []
  private selectedSuggestionIndex: number = -1
  private visible: boolean = false

  constructor(
    container: HTMLElement,
    app: any,
    onFileChange: (filePath: string | null, isCurrentFile: boolean) => void,
    options: FileSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Linking to...",
      debounceMs: 300,
      ...options,
    }
    this.onFileChange = onFileChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.searchFiles(query)
    }, this.options.debounceMs!)
    this.render(container)
    this.updateCurrentActiveFile()
  }

  private render(container: HTMLElement): void {
    // Create file container
    this.fileContainer = container.createEl("div", {
      cls: "file-container",
    })
    this.fileContainer.style.display = "none"

    // Create target button (outside input container)
    this.targetButton = this.fileContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "target-file" },
    })
    setIcon(this.targetButton, "target")
    setTooltip(this.targetButton, "Select Current Active File")

    this.registerDomEvent(this.targetButton, "click", () => {
      this.toggleCurrentFileMode()
    })

    // Create file input container (using custom classes)
    this.fileInputContainer = this.fileContainer.createEl("div", {
      cls: "file-input-container",
    })

    // Create link icon
    const linkIcon = this.fileInputContainer.createEl("div", {
      cls: "file-input-icon",
    })
    setIcon(linkIcon, "link")

    // Create file input
    this.fileInput = this.fileInputContainer.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder!,
      attr: {
        id: "file-input",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.fileInput.classList.add("file-input")

    // Create clear button (using Obsidian's exact class)
    this.fileClear = this.fileInputContainer.createEl("div", {
      cls: "search-input-clear-button",
      attr: {
        "aria-label": "Clear file selection",
      },
    })
    this.fileClear.style.display = "none"

    // Create suggestions container
    this.suggestionsContainer = this.fileContainer.createEl("div", {
      cls: "file-suggestions-container",
    })
    this.suggestionsContainer.style.display = "none"

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "file-suggestions-list",
    })

    // Add input event listeners
    this.registerDomEvent(this.fileInput, "input", e => {
      const target = e.target as HTMLInputElement
      this.updateClearButton(target.value)
      this.debouncedSearchChange(target.value)
    })

    this.registerDomEvent(this.fileInput, "focus", () => {
      this.showSuggestions()
      if (this.fileInput.value === "") {
        this.showCurrentFileSuggestion()
      }
    })

    this.registerDomEvent(this.fileInput, "blur", () => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        this.hideSuggestions()
      }, 200)
    })

    this.registerDomEvent(this.fileInput, "keydown", e => {
      this.handleKeydown(e)
    })

    // Add clear button event listener
    this.registerDomEvent(this.fileClear, "click", () => {
      this.fileInput.value = ""
      this.fileClear.style.display = "none"
      this.clearSelection()
    })

    // Add suggestions click listeners
    this.registerDomEvent(this.suggestionsList, "click", e => {
      const target = e.target as HTMLElement
      const suggestionEl = target.closest(".file-suggestion")
      if (suggestionEl) {
        const index = parseInt(suggestionEl.getAttribute("data-index") || "0")
        this.selectSuggestion(index)
      }
    })
  }

  /**
   * Update current active file reference
   */
  private updateCurrentActiveFile(): void {
    this.currentActiveFile = this.app.workspace.getActiveFile()
  }

  /**
   * Toggle between current file mode and manual selection
   */
  private toggleCurrentFileMode(): void {
    if (this.isCurrentFileMode) {
      // Deactivate current file mode
      this.isCurrentFileMode = false
      this.targetButton.removeClass("is-active")

      // Show actual filename instead of "Current Active File"
      if (this.currentActiveFile) {
        this.fileInput.value = this.currentActiveFile.basename
        this.updateClearButton(this.fileInput.value)
        this.onFileChange(this.currentActiveFile.path, false)
      } else {
        this.fileInput.value = ""
        this.updateClearButton(this.fileInput.value)
        this.onFileChange(null, false)
      }
    } else {
      // Activate current file mode
      this.isCurrentFileMode = true
      this.targetButton.addClass("is-active")
      this.updateCurrentActiveFile()
      if (this.currentActiveFile) {
        this.fileInput.value = "Current Active File"
        this.updateClearButton(this.fileInput.value)
        this.onFileChange(this.currentActiveFile.path, true)
      }
    }
  }

  /**
   * Search for files matching the query
   */
  private searchFiles(query: string): void {
    if (!query.trim()) {
      this.showCurrentFileSuggestion()
      return
    }

    const allFiles = this.app.vault.getFiles()
    const queryLower = query.toLowerCase()

    this.suggestions = allFiles
      .filter((file: TFile) => {
        const name = file.name.toLowerCase()
        const path = file.path.toLowerCase()
        return name.includes(queryLower) || path.includes(queryLower)
      })
      .slice(0, 10) // Limit to 10 suggestions
      .map((file: TFile) => ({
        file,
        displayName: file.basename,
        fullPath: file.path,
      }))

    this.renderSuggestions()
  }

  /**
   * Show current file as the first suggestion
   */
  private showCurrentFileSuggestion(): void {
    this.updateCurrentActiveFile()
    if (this.currentActiveFile) {
      this.suggestions = [
        {
          file: this.currentActiveFile,
          displayName: "Current Active File",
          fullPath: this.currentActiveFile.path,
        },
      ]
    } else {
      this.suggestions = []
    }
    this.renderSuggestions()
  }

  /**
   * Render suggestions list
   */
  private renderSuggestions(): void {
    this.suggestionsList.empty()
    this.selectedSuggestionIndex = -1

    if (this.suggestions.length === 0) {
      this.hideSuggestions()
      return
    }

    this.suggestions.forEach((suggestion, index) => {
      const suggestionEl = this.suggestionsList.createEl("div", {
        cls: "file-suggestion",
        attr: { "data-index": index.toString() },
      })

      const fileName = suggestionEl.createEl("div", {
        cls: "file-suggestion-name",
        text: suggestion.displayName,
      })

      const filePath = suggestionEl.createEl("div", {
        cls: "file-suggestion-path",
        text: suggestion.fullPath,
      })

      // Add click handler using registerDomEvent for proper cleanup
      this.registerDomEvent(suggestionEl, "click", () => {
        this.selectSuggestion(index)
      })
    })

    this.showSuggestions()
  }

  /**
   * Select a suggestion
   */
  private selectSuggestion(index: number): void {
    if (index < 0 || index >= this.suggestions.length) return

    const suggestion = this.suggestions[index]

    // Check if this is "Current Active File" selection
    if (suggestion.displayName === "Current Active File") {
      // Activate current file mode
      this.isCurrentFileMode = true
      this.targetButton.addClass("is-active")
      this.selectedFile = suggestion.file

      this.fileInput.value = "Current Active File"
      this.updateClearButton(this.fileInput.value)
      this.hideSuggestions()

      this.onFileChange(suggestion.file.path, true)
    } else {
      // Manual file selection
      this.selectedFile = suggestion.file
      this.isCurrentFileMode = false
      this.targetButton.removeClass("is-active")

      this.fileInput.value = suggestion.displayName
      this.updateClearButton(this.fileInput.value)
      this.hideSuggestions()

      this.onFileChange(suggestion.file.path, false)
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (this.suggestionsContainer.style.display === "none") return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        )
        this.updateSuggestionHighlight()
        break
      case "ArrowUp":
        e.preventDefault()
        this.selectedSuggestionIndex = Math.max(
          this.selectedSuggestionIndex - 1,
          -1
        )
        this.updateSuggestionHighlight()
        break
      case "Enter":
        e.preventDefault()
        if (this.selectedSuggestionIndex >= 0) {
          this.selectSuggestion(this.selectedSuggestionIndex)
        }
        break
      case "Escape":
        this.hideSuggestions()
        break
    }
  }

  /**
   * Update suggestion highlight
   */
  private updateSuggestionHighlight(): void {
    const suggestions =
      this.suggestionsList.querySelectorAll(".file-suggestion")
    suggestions.forEach((el, index) => {
      if (index === this.selectedSuggestionIndex) {
        el.addClass("is-selected")
      } else {
        el.removeClass("is-selected")
      }
    })
  }

  /**
   * Update clear button visibility
   */
  private updateClearButton(value: string): void {
    this.fileClear.style.display = value.length > 0 ? "flex" : "none"
  }

  /**
   * Clear the current selection
   */
  private clearSelection(): void {
    this.fileInput.value = ""
    this.updateClearButton(this.fileInput.value)
    this.selectedFile = null
    this.isCurrentFileMode = false
    this.targetButton.removeClass("is-active")
    this.hideSuggestions()
    this.onFileChange(null, false)
  }

  /**
   * Show the file selector
   */
  public show(): void {
    if (!this.visible) {
      this.fileContainer.style.display = "block"
      this.visible = true
      this.fileInput.focus()
    }
  }

  /**
   * Hide the file selector
   */
  public hide(): void {
    this.fileContainer.style.display = "none"
    this.visible = false
    this.hideSuggestions()
  }

  /**
   * Clear the input and reset state
   */
  public clearInput(): void {
    this.fileInput.value = ""
    this.updateClearButton(this.fileInput.value)
    this.selectedFile = null
    this.isCurrentFileMode = false
    this.targetButton.removeClass("is-active")
    this.hideSuggestions()
  }

  /**
   * Show suggestions container
   */
  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  /**
   * Hide suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
    this.selectedSuggestionIndex = -1
  }

  /**
   * Get the current selected file path
   */
  public getValue(): string | null {
    if (this.isCurrentFileMode && this.currentActiveFile) {
      return this.currentActiveFile.path
    }
    return this.selectedFile?.path || null
  }

  /**
   * Check if current file mode is active
   */
  public isCurrentFileModeActive(): boolean {
    return this.isCurrentFileMode
  }

  /**
   * Update current active file (called when active file changes)
   */
  public updateActiveFile(): void {
    this.updateCurrentActiveFile()
    if (this.isCurrentFileMode && this.currentActiveFile) {
      this.fileInput.value = "Current Active File"
      this.updateClearButton(this.fileInput.value)
      this.onFileChange(this.currentActiveFile.path, true)
    }
  }

  /**
   * Check if the file selector is visible
   */
  public isVisible(): boolean {
    return this.visible
  }

  public getElement(): HTMLElement {
    return this.fileContainer
  }
}
