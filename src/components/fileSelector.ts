import { Component, TFile, setIcon, debounce, fuzzySearch, prepareFuzzySearch } from "obsidian"

export interface FileSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export class FileSelector extends Component {
  private app: any
  private fileSelectorContainer: HTMLElement
  private inputContainer: HTMLElement
  private inputElement: HTMLInputElement
  private clearButton: HTMLElement
  private targetButton: HTMLElement
  private suggestionsContainer: HTMLElement
  private onFileChange: (filePath: string | null, isCurrentFile: boolean) => void
  private debouncedInputChange: (query: string) => void
  private options: FileSelectorOptions
  private isCurrentFileMode: boolean = false
  private currentFile: TFile | null = null
  private allFiles: TFile[] = []
  private isVisible: boolean = false

  constructor(
    app: any,
    container: HTMLElement,
    onFileChange: (filePath: string | null, isCurrentFile: boolean) => void,
    options: FileSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Linking to...",
      debounceMs: 200,
      ...options,
    }
    this.onFileChange = onFileChange
    this.debouncedInputChange = debounce((query: string) => {
      this.updateSuggestions(query)
    }, this.options.debounceMs!)
    
    this.render(container)
    this.updateFilesList()
    
    // Listen for active file changes
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateCurrentFile()
      })
    )
  }

  private render(container: HTMLElement): void {
    // Create main file selector container
    this.fileSelectorContainer = container.createEl("div", {
      cls: "file-selector-container",
    })
    this.fileSelectorContainer.style.display = "none"

    // Create input container with target button
    this.inputContainer = this.fileSelectorContainer.createEl("div", {
      cls: "file-selector-input-container",
    })

    // Create input element
    this.inputElement = this.inputContainer.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder!,
      attr: {
        id: "file-selector-input",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.inputElement.classList.add("file-selector-input")

    // Create clear button
    this.clearButton = this.inputContainer.createEl("div", {
      cls: "file-selector-clear-button",
      attr: {
        "aria-label": "Clear selection",
      },
    })
    this.clearButton.style.display = "none"

    // Create target button (current file toggle)
    this.targetButton = this.inputContainer.createEl("div", {
      cls: "clickable-icon file-selector-target-button",
      attr: {
        "aria-label": "Toggle current file",
      },
    })
    setIcon(this.targetButton, "target")

    // Create suggestions container
    this.suggestionsContainer = this.fileSelectorContainer.createEl("div", {
      cls: "file-selector-suggestions",
    })
    this.suggestionsContainer.style.display = "none"

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Input focus/blur events
    this.inputElement.addEventListener("focus", () => {
      this.showSuggestions()
      this.updateSuggestions(this.inputElement.value)
    })

    this.inputElement.addEventListener("blur", (e) => {
      // Delay hiding suggestions to allow for suggestion clicks
      setTimeout(() => {
        if (!this.suggestionsContainer.contains(e.relatedTarget as Node)) {
          this.hideSuggestions()
        }
      }, 150)
    })

    // Input change events
    this.inputElement.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement
      const value = target.value
      this.updateClearButton(value)
      this.debouncedInputChange(value)

      // Exit current file mode when typing
      if (this.isCurrentFileMode && value !== "Current Active File") {
        this.setCurrentFileMode(false)
      }
    })

    // Clear button
    this.clearButton.addEventListener("click", () => {
      this.clearSelection()
    })

    // Target button (current file toggle)
    this.targetButton.addEventListener("click", () => {
      this.toggleCurrentFileMode()
    })

    // Keyboard navigation
    this.inputElement.addEventListener("keydown", (e) => {
      this.handleKeyNavigation(e)
    })
  }

  private updateFilesList(): void {
    this.allFiles = this.app.vault.getMarkdownFiles()
  }

  private updateCurrentFile(): void {
    this.currentFile = this.app.workspace.getActiveFile()
    
    // If in current file mode, update the input and trigger callback
    if (this.isCurrentFileMode) {
      this.updateInputForCurrentFile()
      this.onFileChange(this.currentFile?.path || null, true)
    }
  }

  private updateInputForCurrentFile(): void {
    if (this.currentFile) {
      this.inputElement.value = this.currentFile.basename
    } else {
      this.inputElement.value = "Current Active File"
    }
    this.updateClearButton(this.inputElement.value)
  }

  private setCurrentFileMode(enabled: boolean): void {
    this.isCurrentFileMode = enabled
    
    if (enabled) {
      this.targetButton.addClass("is-active")
      this.updateInputForCurrentFile()
      this.onFileChange(this.currentFile?.path || null, true)
    } else {
      this.targetButton.removeClass("is-active")
    }
  }

  private toggleCurrentFileMode(): void {
    this.setCurrentFileMode(!this.isCurrentFileMode)
  }

  private clearSelection(): void {
    this.inputElement.value = ""
    this.clearButton.style.display = "none"
    this.setCurrentFileMode(false)
    this.onFileChange(null, false)
    this.updateSuggestions("")
  }

  private updateClearButton(value: string): void {
    this.clearButton.style.display = value.length > 0 ? "flex" : "none"
  }

  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
  }

  private updateSuggestions(query: string): void {
    this.suggestionsContainer.empty()

    let files: TFile[] = []

    if (!query.trim()) {
      // Show current active file first when no query
      if (this.currentFile) {
        files = [this.currentFile, ...this.allFiles.filter(f => f !== this.currentFile)]
      } else {
        files = this.allFiles
      }
      // Limit to first 10 when no query
      files = files.slice(0, 10)
    } else {
      // Filter files by fuzzy search
      const preparedSearch = prepareFuzzySearch(query)
      const searchResults = this.allFiles
        .map(file => ({
          file,
          match: fuzzySearch(preparedSearch, file.basename)
        }))
        .filter(result => result.match)
        .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
        .slice(0, 10)
      
      files = searchResults.map(r => r.file)
    }

    // Add current file suggestion if no query and not already first
    if (!query.trim() && (!this.currentFile || files[0] !== this.currentFile)) {
      this.createCurrentFileSuggestion()
    }

    // Create file suggestions
    files.forEach(file => {
      this.createFileSuggestion(file, query)
    })
  }

  private createCurrentFileSuggestion(): void {
    const suggestionEl = this.suggestionsContainer.createEl("div", {
      cls: "file-selector-suggestion current-file-suggestion",
    })

    const nameEl = suggestionEl.createEl("div", {
      cls: "suggestion-title",
      text: "Current Active File"
    })

    const pathEl = suggestionEl.createEl("div", {
      cls: "suggestion-note",
      text: this.currentFile ? this.currentFile.path : "No active file"
    })

    suggestionEl.addEventListener("click", () => {
      this.selectCurrentFile()
      this.hideSuggestions()
    })
  }

  private createFileSuggestion(file: TFile, query: string): void {
    const suggestionEl = this.suggestionsContainer.createEl("div", {
      cls: "file-selector-suggestion",
    })

    // Highlight matching text in filename
    const nameEl = suggestionEl.createEl("div", {
      cls: "suggestion-title",
    })
    
    if (query.trim()) {
      const preparedSearch = prepareFuzzySearch(query)
      const match = fuzzySearch(preparedSearch, file.basename)
      if (match) {
        nameEl.innerHTML = this.highlightMatches(file.basename, match.matches)
      } else {
        nameEl.textContent = file.basename
      }
    } else {
      nameEl.textContent = file.basename
    }

    const pathEl = suggestionEl.createEl("div", {
      cls: "suggestion-note",
      text: file.path
    })

    suggestionEl.addEventListener("click", () => {
      this.selectFile(file)
      this.hideSuggestions()
    })
  }

  private highlightMatches(text: string, matches: number[][]): string {
    let result = ""
    let lastIndex = 0

    matches.forEach(([start, end]) => {
      result += text.slice(lastIndex, start)
      result += `<span class="suggestion-highlight">${text.slice(start, end + 1)}</span>`
      lastIndex = end + 1
    })

    result += text.slice(lastIndex)
    return result
  }

  private selectCurrentFile(): void {
    this.setCurrentFileMode(true)
    this.inputElement.blur()
  }

  private selectFile(file: TFile): void {
    this.inputElement.value = file.basename
    this.updateClearButton(file.basename)
    this.setCurrentFileMode(false)
    this.onFileChange(file.path, false)
    this.inputElement.blur()
  }

  private handleKeyNavigation(e: KeyboardEvent): void {
    const suggestions = this.suggestionsContainer.querySelectorAll('.file-selector-suggestion')
    if (suggestions.length === 0) return

    let currentIndex = -1
    suggestions.forEach((el, index) => {
      if (el.classList.contains('is-selected')) {
        currentIndex = index
      }
    })

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0
        this.selectSuggestionAtIndex(suggestions, nextIndex)
        break
      
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1
        this.selectSuggestionAtIndex(suggestions, prevIndex)
        break
      
      case 'Enter':
        e.preventDefault()
        if (currentIndex >= 0) {
          (suggestions[currentIndex] as HTMLElement).click()
        }
        break
      
      case 'Escape':
        e.preventDefault()
        this.hideSuggestions()
        this.inputElement.blur()
        break
    }
  }

  private selectSuggestionAtIndex(suggestions: NodeListOf<Element>, index: number): void {
    suggestions.forEach(el => (el as any).removeClass('is-selected'))
    const selectedEl = suggestions[index] as any
    selectedEl?.addClass('is-selected')
  }

  /**
   * Show the file selector
   */
  public show(): void {
    this.fileSelectorContainer.style.display = "block"
    this.isVisible = true
    this.updateFilesList()
    this.updateCurrentFile()
    this.inputElement.focus()
  }

  /**
   * Hide the file selector
   */
  public hide(): void {
    this.fileSelectorContainer.style.display = "none"
    this.isVisible = false
    this.hideSuggestions()
    this.clearSelection()
  }

  /**
   * Check if the file selector is visible
   */
  public isShowing(): boolean {
    return this.isVisible
  }

  /**
   * Get the current selected file path
   */
  public getSelectedFilePath(): string | null {
    if (this.isCurrentFileMode) {
      return this.currentFile?.path || null
    }
    
    // Find file by basename
    const file = this.allFiles.find(f => f.basename === this.inputElement.value)
    return file?.path || null
  }

  /**
   * Get whether current file mode is active
   */
  public isCurrentFileModeActive(): boolean {
    return this.isCurrentFileMode
  }

  public getElement(): HTMLElement {
    return this.fileSelectorContainer
  }
}