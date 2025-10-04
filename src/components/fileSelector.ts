import { Component, debounce, TFile, setIcon } from "obsidian"

export interface FileSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export interface FileSelection {
  isCurrentFile: boolean
  file?: TFile
  displayName: string
}

export class FileSelector extends Component {
  private app: any
  private fileSelectorContainer: HTMLElement
  private inputContainer: HTMLElement
  private input: HTMLInputElement
  private clearButton: HTMLElement
  private targetButton: HTMLElement
  private suggestionsContainer: HTMLElement
  private onFileChange: (selection: FileSelection) => void
  private debouncedSearch: (query: string) => void
  private options: FileSelectorOptions
  private isCurrentFileMode: boolean = false
  private currentSelection: FileSelection | null = null

  constructor(
    app: any,
    container: HTMLElement,
    onFileChange: (selection: FileSelection) => void,
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
    this.debouncedSearch = debounce((query: string) => {
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

    // Create input container with link icon
    this.inputContainer = this.fileSelectorContainer.createEl("div", {
      cls: "file-selector-input-container",
    })

    // Add link icon
    const linkIcon = this.inputContainer.createEl("div", {
      cls: "file-selector-icon",
    })
    setIcon(linkIcon, "link")

    // Create input element
    this.input = this.inputContainer.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder!,
      attr: {
        id: "file-selector-input",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.input.classList.add("file-selector-input")

    // Create clear button
    this.clearButton = this.inputContainer.createEl("div", {
      cls: "file-selector-clear-button",
      attr: {
        "aria-label": "Clear file selection",
      },
    })
    this.clearButton.style.display = "none"

    // Create target button (current file toggle)
    this.targetButton = this.inputContainer.createEl("div", {
      cls: "file-selector-target-button clickable-icon",
      attr: {
        "aria-label": "Toggle current active file",
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
    // Input event listeners
    this.input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement
      const value = target.value
      this.updateClearButton(value)
      
      // Exit current file mode when typing
      if (this.isCurrentFileMode && value !== "Current Active File") {
        this.isCurrentFileMode = false
        this.updateTargetButtonState()
      }
      
      this.debouncedSearch(value)
    })

    this.input.addEventListener("focus", () => {
      this.showSuggestions()
      if (this.input.value === "") {
        this.updateSuggestions("")
      }
    })

    this.input.addEventListener("blur", (e) => {
      // Delay hiding to allow suggestion clicks
      setTimeout(() => {
        if (!this.suggestionsContainer.contains(e.relatedTarget as Node)) {
          this.hideSuggestions()
        }
      }, 150)
    })

    // Clear button
    this.clearButton.addEventListener("click", () => {
      this.clearSelection()
    })

    // Target button (current file toggle)
    this.targetButton.addEventListener("click", () => {
      this.toggleCurrentFileMode()
    })

    // Document click to hide suggestions
    document.addEventListener("click", (e) => {
      if (!this.fileSelectorContainer.contains(e.target as Node)) {
        this.hideSuggestions()
      }
    })
  }

  private updateClearButton(value: string): void {
    this.clearButton.style.display = value.length > 0 ? "flex" : "none"
  }

  private updateTargetButtonState(): void {
    if (this.isCurrentFileMode) {
      this.targetButton.addClass("is-active")
    } else {
      this.targetButton.removeClass("is-active")
    }
  }

  private toggleCurrentFileMode(): void {
    this.isCurrentFileMode = !this.isCurrentFileMode
    
    if (this.isCurrentFileMode) {
      const currentFile = this.app.workspace.getActiveFile()
      this.input.value = "Current Active File"
      this.currentSelection = {
        isCurrentFile: true,
        file: currentFile,
        displayName: "Current Active File"
      }
    } else {
      const currentFile = this.app.workspace.getActiveFile()
      if (currentFile) {
        this.input.value = currentFile.basename
        this.currentSelection = {
          isCurrentFile: false,
          file: currentFile,
          displayName: currentFile.basename
        }
      } else {
        this.clearSelection()
      }
    }
    
    this.updateTargetButtonState()
    this.updateClearButton(this.input.value)
    
    if (this.currentSelection) {
      this.onFileChange(this.currentSelection)
    }
  }

  private clearSelection(): void {
    this.input.value = ""
    this.clearButton.style.display = "none"
    this.isCurrentFileMode = false
    this.currentSelection = null
    this.updateTargetButtonState()
    this.hideSuggestions()
    
    // Trigger callback with null selection
    this.onFileChange({
      isCurrentFile: false,
      displayName: ""
    })
  }

  private showSuggestions(): void {
    this.suggestionsContainer.style.display = "block"
  }

  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
  }

  private updateSuggestions(query: string): void {
    // Clear existing suggestions
    this.suggestionsContainer.empty()

    const files = this.app.vault.getMarkdownFiles()
    let filteredFiles: TFile[] = []

    if (query === "") {
      // Show current active file first when no query
      const currentFile = this.app.workspace.getActiveFile()
      if (currentFile) {
        filteredFiles = [currentFile, ...files.filter((f: TFile) => f !== currentFile)]
      } else {
        filteredFiles = files
      }
    } else {
      // Filter files by query
      filteredFiles = files.filter((file: TFile) => 
        file.basename.toLowerCase().includes(query.toLowerCase()) ||
        file.path.toLowerCase().includes(query.toLowerCase())
      )
    }

    // Limit suggestions for performance
    const maxSuggestions = 20
    const displayFiles = filteredFiles.slice(0, maxSuggestions)

    displayFiles.forEach((file: TFile, index: number) => {
      const suggestionEl = this.suggestionsContainer.createEl("div", {
        cls: "file-selector-suggestion",
      })

      const isCurrentFile = query === "" && index === 0 && file === this.app.workspace.getActiveFile()
      
      // File name
      const fileName = suggestionEl.createEl("div", {
        cls: "file-selector-suggestion-name",
        text: isCurrentFile ? "Current Active File" : file.basename,
      })

      // File path (muted)
      const filePath = suggestionEl.createEl("div", {
        cls: "file-selector-suggestion-path",
        text: file.path,
      })

      suggestionEl.addEventListener("click", () => {
        this.selectFile(file, isCurrentFile)
      })

      suggestionEl.addEventListener("mousedown", (e) => {
        e.preventDefault() // Prevent input blur
      })
    })

    if (displayFiles.length === 0) {
      const noResults = this.suggestionsContainer.createEl("div", {
        cls: "file-selector-no-results",
        text: "No files found",
      })
    }
  }

  private selectFile(file: TFile, asCurrentFile: boolean = false): void {
    if (asCurrentFile) {
      this.isCurrentFileMode = true
      this.input.value = "Current Active File"
      this.currentSelection = {
        isCurrentFile: true,
        file: file,
        displayName: "Current Active File"
      }
    } else {
      this.isCurrentFileMode = false
      this.input.value = file.basename
      this.currentSelection = {
        isCurrentFile: false,
        file: file,
        displayName: file.basename
      }
    }

    this.updateClearButton(this.input.value)
    this.updateTargetButtonState()
    this.hideSuggestions()
    this.onFileChange(this.currentSelection)
  }

  /**
   * Show the file selector
   */
  public show(): void {
    this.fileSelectorContainer.style.display = "block"
    this.input.focus()
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
  public getSelection(): FileSelection | null {
    return this.currentSelection
  }

  /**
   * Set the selection programmatically
   */
  public setSelection(selection: FileSelection): void {
    this.currentSelection = selection
    this.isCurrentFileMode = selection.isCurrentFile
    this.input.value = selection.displayName
    this.updateClearButton(selection.displayName)
    this.updateTargetButtonState()
    this.onFileChange(selection)
  }

  /**
   * Check if the file selector is visible
   */
  public isVisible(): boolean {
    return this.fileSelectorContainer.style.display === "block"
  }

  /**
   * Handle active file changes when in current file mode
   */
  public onActiveFileChange(file: TFile | null): void {
    if (this.isCurrentFileMode) {
      this.currentSelection = {
        isCurrentFile: true,
        file: file,
        displayName: "Current Active File"
      }
      this.onFileChange(this.currentSelection)
    }
  }

  public getElement(): HTMLElement {
    return this.fileSelectorContainer
  }
}