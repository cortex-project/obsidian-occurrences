import { Component, debounce, TFile, setIcon, App } from "obsidian"

export interface FileSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export interface FileSelectorResult {
  type: "current" | "file"
  file: TFile | null
}

export class FileSelector extends Component {
  private fileSelectorContainer: HTMLElement
  private fileSelectorInputContainer: HTMLElement
  private fileSelectorInput: HTMLInputElement
  private fileSelectorClear: HTMLElement
  private targetButton: HTMLElement
  private suggestionsContainer: HTMLElement
  private onSelectionChange: (result: FileSelectorResult) => void
  private debouncedSearchChange: (query: string) => void
  private options: FileSelectorOptions
  private isCurrentFileMode = false
  private currentFile: TFile | null = null
  private app: App

  constructor(
    container: HTMLElement,
    app: App,
    onSelectionChange: (result: FileSelectorResult) => void,
    options: FileSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Linking to...",
      debounceMs: 300,
      ...options,
    }
    this.onSelectionChange = onSelectionChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.updateSuggestions(query)
    }, this.options.debounceMs!)
    this.render(container)
  }

  private render(container: HTMLElement): void {
    // Create file selector container
    this.fileSelectorContainer = container.createEl("div", {
      cls: "file-selector-container",
    })
    this.fileSelectorContainer.style.display = "none"

    // Create input container with target button
    this.fileSelectorInputContainer = this.fileSelectorContainer.createEl("div", {
      cls: "file-selector-input-container",
    })

    // Create link icon
    const linkIcon = this.fileSelectorInputContainer.createEl("div", {
      cls: "file-selector-icon",
    })
    setIcon(linkIcon, "link")

    // Create file selector input
    this.fileSelectorInput = this.fileSelectorInputContainer.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder!,
      attr: {
        id: "file-selector-input",
        enterkeyhint: "search",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.fileSelectorInput.classList.add("file-selector-input")

    // Create clear button
    this.fileSelectorClear = this.fileSelectorInputContainer.createEl("div", {
      cls: "file-selector-clear-button",
      attr: {
        "aria-label": "Clear file selection",
      },
    })
    this.fileSelectorClear.style.display = "none"

    // Create target button
    this.targetButton = this.fileSelectorInputContainer.createEl("div", {
      cls: "file-selector-target-button clickable-icon",
      attr: {
        "aria-label": "Toggle current file mode",
      },
    })
    setIcon(this.targetButton, "target")

    // Create suggestions container
    this.suggestionsContainer = this.fileSelectorContainer.createEl("div", {
      cls: "file-selector-suggestions",
    })
    this.suggestionsContainer.style.display = "none"

    this.addEventListeners()
  }

  private addEventListeners(): void {
    // Input events
    this.fileSelectorInput.addEventListener("input", e => {
      const target = e.target as HTMLInputElement
      this.updateClearButton(target.value)
      this.debouncedSearchChange(target.value)
    })

    this.fileSelectorInput.addEventListener("focus", () => {
      this.showSuggestions()
      if (this.fileSelectorInput.value === "") {
        this.updateSuggestions("")
      }
    })

    this.fileSelectorInput.addEventListener("blur", () => {
      // Delay hiding suggestions to allow for click events
      setTimeout(() => {
        this.hideSuggestions()
      }, 150)
    })

    // Clear button
    this.fileSelectorClear.addEventListener("click", () => {
      this.fileSelectorInput.value = ""
      this.fileSelectorClear.style.display = "none"
      this.isCurrentFileMode = false
      this.updateTargetButtonState()
      this.debouncedSearchChange("")
      this.onSelectionChange({ type: "file", file: null })
    })

    // Target button
    this.targetButton.addEventListener("click", () => {
      this.toggleCurrentFileMode()
    })
  }

  private toggleCurrentFileMode(): void {
    this.isCurrentFileMode = !this.isCurrentFileMode
    
    if (this.isCurrentFileMode) {
      this.fileSelectorInput.value = "Current Active File"
      this.fileSelectorClear.style.display = "flex"
      this.onSelectionChange({ type: "current", file: null })
    } else {
      // Replace with actual current file name if available
      if (this.currentFile) {
        this.fileSelectorInput.value = this.currentFile.basename
        this.onSelectionChange({ type: "file", file: this.currentFile })
      } else {
        this.fileSelectorInput.value = ""
        this.onSelectionChange({ type: "file", file: null })
      }
    }
    
    this.updateTargetButtonState()
    this.updateClearButton(this.fileSelectorInput.value)
  }

  private updateTargetButtonState(): void {
    if (this.isCurrentFileMode) {
      this.targetButton.addClass("is-active")
    } else {
      this.targetButton.removeClass("is-active")
    }
  }

  private updateClearButton(value: string): void {
    this.fileSelectorClear.style.display = value.length > 0 ? "flex" : "none"
  }

  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
  }

  private updateSuggestions(query: string): void {
    this.suggestionsContainer.empty()

    // Get all markdown files
    const files = this.app.vault.getMarkdownFiles() as TFile[]
    
    // If empty query, show current active file first
    if (query === "" && this.currentFile) {
      this.addSuggestionItem(this.currentFile, true)
    }

    // Filter and sort files based on query
    const filteredFiles = files.filter(file => {
      if (query === "") return file !== this.currentFile // Don't duplicate current file
      return file.basename.toLowerCase().includes(query.toLowerCase()) ||
             file.path.toLowerCase().includes(query.toLowerCase())
    })

    // Sort by relevance (basename match first, then path match)
    filteredFiles.sort((a, b) => {
      if (query === "") return a.basename.localeCompare(b.basename)
      
      const aBasenameMatch = a.basename.toLowerCase().startsWith(query.toLowerCase())
      const bBasenameMatch = b.basename.toLowerCase().startsWith(query.toLowerCase())
      
      if (aBasenameMatch && !bBasenameMatch) return -1
      if (!aBasenameMatch && bBasenameMatch) return 1
      
      return a.basename.localeCompare(b.basename)
    })

    // Add up to 10 suggestions
    filteredFiles.slice(0, 10).forEach(file => {
      this.addSuggestionItem(file, false)
    })
  }

  private addSuggestionItem(file: TFile, isCurrentFile: boolean): void {
    const suggestionEl = this.suggestionsContainer.createEl("div", {
      cls: "file-selector-suggestion-item",
    })

    const nameEl = suggestionEl.createEl("div", {
      cls: "file-selector-suggestion-name",
      text: isCurrentFile ? `${file.basename} (Current)` : file.basename,
    })

    const pathEl = suggestionEl.createEl("div", {
      cls: "file-selector-suggestion-path",
      text: file.path,
    })

    suggestionEl.addEventListener("click", () => {
      this.selectFile(file)
      this.hideSuggestions()
    })
  }

  private selectFile(file: TFile): void {
    this.fileSelectorInput.value = file.basename
    this.isCurrentFileMode = false
    this.updateTargetButtonState()
    this.updateClearButton(file.basename)
    this.onSelectionChange({ type: "file", file })
  }

  /**
   * Update the current file reference
   */
  public setCurrentFile(file: TFile | null): void {
    this.currentFile = file
    
    // If we're in current file mode and the current file changes,
    // update the display if target button is not active
    if (!this.isCurrentFileMode && this.fileSelectorInput.value === "Current Active File") {
      if (file) {
        this.fileSelectorInput.value = file.basename
        this.onSelectionChange({ type: "file", file })
      } else {
        this.fileSelectorInput.value = ""
        this.onSelectionChange({ type: "file", file: null })
      }
      this.updateClearButton(this.fileSelectorInput.value)
    }
  }

  /**
   * Show the file selector
   */
  public show(): void {
    this.fileSelectorContainer.style.display = "block"
    this.fileSelectorInput.focus()
  }

  /**
   * Hide the file selector
   */
  public hide(): void {
    this.fileSelectorContainer.style.display = "none"
    this.hideSuggestions()
  }

  /**
   * Get the current selection
   */
  public getSelection(): FileSelectorResult {
    if (this.isCurrentFileMode) {
      return { type: "current", file: null }
    }
    
    // Try to find the file by name
    const files = this.app.vault.getMarkdownFiles() as TFile[]
    const file = files.find(f => f.basename === this.fileSelectorInput.value)
    return { type: "file", file: file || null }
  }

  /**
   * Set the file selector value programmatically
   */
  public setValue(result: FileSelectorResult): void {
    if (result.type === "current") {
      this.isCurrentFileMode = true
      this.fileSelectorInput.value = "Current Active File"
    } else if (result.file) {
      this.isCurrentFileMode = false
      this.fileSelectorInput.value = result.file.basename
    } else {
      this.isCurrentFileMode = false
      this.fileSelectorInput.value = ""
    }
    
    this.updateTargetButtonState()
    this.updateClearButton(this.fileSelectorInput.value)
    this.onSelectionChange(result)
  }

  /**
   * Check if the file selector is visible
   */
  public isVisible(): boolean {
    return this.fileSelectorContainer.style.display === "block"
  }

  public getElement(): HTMLElement {
    return this.fileSelectorContainer
  }
}