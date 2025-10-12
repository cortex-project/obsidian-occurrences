import { Component, debounce, setIcon } from "obsidian"

export interface TagSelectorOptions {
  placeholder?: string
  debounceMs?: number
}

export class TagSelector extends Component {
  private tagContainer: HTMLElement
  private tagInputContainer: HTMLElement
  private tagInput: HTMLInputElement
  private tagClear: HTMLElement
  private suggestionsContainer: HTMLElement
  private suggestionsList: HTMLElement
  private selectedTagsContainer: HTMLElement
  private onTagsChange: (tags: string[]) => void
  private debouncedSearchChange: (query: string) => void
  private options: TagSelectorOptions
  private app: any
  private selectedTags: string[] = []
  private availableTags: string[] = []
  private filteredTags: string[] = []
  private selectedSuggestionIndex: number = -1
  private selectedTagIndex: number = -1 // Index of currently selected tag for navigation
  private visible: boolean = false

  constructor(
    container: HTMLElement,
    app: any,
    onTagsChange: (tags: string[]) => void,
    options: TagSelectorOptions = {}
  ) {
    super()
    this.app = app
    this.options = {
      placeholder: "Empty",
      debounceMs: 300,
      ...options,
    }
    this.onTagsChange = onTagsChange
    this.debouncedSearchChange = debounce((query: string) => {
      this.filterTags(query)
    }, this.options.debounceMs!)
    this.render(container)
    this.loadAvailableTags()
    this.updatePlaceholder()
  }

  private render(container: HTMLElement): void {
    // Create tag container
    this.tagContainer = container.createEl("div", {
      cls: "tag-container",
    })
    this.tagContainer.style.display = "none"

    // Create tag input container
    this.tagInputContainer = this.tagContainer.createEl("div", {
      cls: "tag-input-container",
      attr: {
        tabindex: "0",
      },
    })

    // Create tag icon
    const tagIcon = this.tagInputContainer.createEl("div", {
      cls: "tag-input-icon",
    })
    setIcon(tagIcon, "tags")

    // Create input wrapper for positioning (this will contain tags and input as direct children)
    const inputWrapper = this.tagInputContainer.createEl("div", {
      cls: "tag-input-wrapper",
    })

    // Store reference to input wrapper for later use
    this.selectedTagsContainer = inputWrapper // Reuse variable to avoid breaking other references

    // Create tag input
    this.tagInput = inputWrapper.createEl("input", {
      type: "text",
      placeholder: this.options.placeholder || "",
      attr: {
        id: "tag-input",
        spellcheck: "false",
      },
    }) as HTMLInputElement
    this.tagInput.classList.add("tag-input")

    // Create clear button
    this.tagClear = inputWrapper.createEl("div", {
      cls: "search-input-clear-button",
      attr: {
        "aria-label": "Clear all tags",
      },
    })
    this.tagClear.style.display = "none"

    // Create suggestions container and append to document.body
    // This ensures it's not affected by parent transforms/positioning
    this.suggestionsContainer = document.body.createEl("div", {
      cls: "tag-suggestions-container",
    })
    this.suggestionsContainer.style.display = "none"

    this.suggestionsList = this.suggestionsContainer.createEl("div", {
      cls: "tag-suggestions-list",
    })

    // Add event listeners
    this.registerDomEvent(this.tagInput, "input", e => {
      const target = e.target as HTMLInputElement
      this.updateClearButton()
      this.debouncedSearchChange(target.value)

      // Clear tag selection when user starts typing
      if (target.value.trim().length > 0) {
        this.clearTagSelection()
      }
    })

    // Handle container focus and clicks
    this.registerDomEvent(this.tagInputContainer, "focus", () => {
      this.tagInput.focus()
    })

    this.registerDomEvent(this.tagInputContainer, "click", e => {
      // Don't focus if clicking on a tag pill
      if ((e.target as HTMLElement).closest(".tag-pill")) {
        return
      }
      this.tagInput.focus()
    })

    this.registerDomEvent(this.tagInput, "focus", () => {
      this.showSuggestions()
      if (this.tagInput.value === "") {
        this.showAllTags()
      }
    })

    this.registerDomEvent(this.tagInput, "blur", () => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(() => {
        this.hideSuggestions()
      }, 200)
    })

    this.registerDomEvent(this.tagInput, "keydown", e => {
      this.handleKeydown(e)
    })

    // Add clear button event listener
    this.registerDomEvent(this.tagClear, "click", () => {
      this.clearAllTags()
    })

    // Hide suggestions on scroll (anywhere in the document)
    this.registerDomEvent(
      window,
      "scroll",
      () => {
        if (this.suggestionsContainer.style.display !== "none") {
          this.hideSuggestions()
        }
      },
      { capture: true }
    )

    // Reposition suggestions on window resize
    this.registerDomEvent(window, "resize", () => {
      if (this.suggestionsContainer.style.display !== "none") {
        this.updateSuggestionsPosition()
      }
    })

    // Individual click handlers are set up in renderSuggestions for each suggestion element
  }

  /**
   * Load all available tags from the occurrence store
   */
  private loadAvailableTags(): void {
    // Use Obsidian's metadata cache to get all tags
    const allTags = new Set<string>()

    // Get all tags from the metadata cache
    const tags = this.app.metadataCache.getTags()
    if (tags) {
      Object.keys(tags).forEach(tag => {
        allTags.add(tag)
      })
    }

    this.availableTags = Array.from(allTags).sort()
  }

  /**
   * Refresh available tags (useful when metadata cache updates)
   */
  private refreshAvailableTags(): void {
    this.loadAvailableTags()
  }

  /**
   * Filter tags based on search query
   */
  private filterTags(query: string): void {
    if (!query.trim()) {
      this.showAllTags()
      return
    }

    const queryLower = query.toLowerCase()
    this.filteredTags = this.availableTags.filter(tag =>
      tag.toLowerCase().includes(queryLower)
    )

    this.renderSuggestions()
  }

  /**
   * Show all available tags
   */
  private showAllTags(): void {
    this.filteredTags = this.availableTags
    this.renderSuggestions()
  }

  /**
   * Render suggestions list
   */
  private renderSuggestions(): void {
    this.suggestionsList.empty()
    this.selectedSuggestionIndex = -1

    // Filter out already selected tags to avoid creating empty DOM elements
    const availableTags = this.filteredTags.filter(
      tag => !this.selectedTags.includes(tag)
    )

    if (availableTags.length === 0) {
      this.hideSuggestions()
      return
    }

    // Highlight the first suggestion by default
    this.selectedSuggestionIndex = 0

    availableTags.forEach((tag, index) => {
      const suggestionEl = this.suggestionsList.createEl("div", {
        cls: "tag-suggestion",
        attr: { "data-index": index.toString() },
      })

      // Remove # symbol for display
      const displayTag = tag.startsWith("#") ? tag.slice(1) : tag

      // Highlight matching text
      const searchQuery = this.tagInput.value.toLowerCase()
      if (searchQuery && displayTag.toLowerCase().includes(searchQuery)) {
        const tagLower = displayTag.toLowerCase()
        const matchIndex = tagLower.indexOf(searchQuery)
        const beforeMatch = displayTag.substring(0, matchIndex)
        const match = displayTag.substring(
          matchIndex,
          matchIndex + searchQuery.length
        )
        const afterMatch = displayTag.substring(matchIndex + searchQuery.length)

        suggestionEl.innerHTML = `${beforeMatch}<strong>${match}</strong>${afterMatch}`
      } else {
        suggestionEl.textContent = displayTag
      }

      // Add click handler - use closure to capture the current tag
      this.registerDomEvent(suggestionEl, "click", () => {
        this.selectTag(tag)
      })
    })

    // Apply highlighting to the first suggestion
    this.updateSuggestionHighlight()
    this.showSuggestions()
  }

  /**
   * Select a tag
   */
  private selectTag(tag: string): void {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag)
      this.updateSelectedTagsDisplay()
      this.updateClearButton()
      this.hideSuggestions()
      this.tagInput.value = ""
      this.onTagsChange([...this.selectedTags])
    }
  }

  /**
   * Remove a tag
   */
  private removeTag(tag: string): void {
    this.selectedTags = this.selectedTags.filter(t => t !== tag)
    this.updateSelectedTagsDisplay()
    this.updateClearButton()
    this.onTagsChange([...this.selectedTags])
  }

  /**
   * Update the display of selected tags
   */
  private updateSelectedTagsDisplay(): void {
    // Remove existing tag pills from wrapper
    const existingPills =
      this.selectedTagsContainer.querySelectorAll(".tag-pill")
    existingPills.forEach(pill => pill.remove())

    // Create tag pills directly in wrapper, before the input
    this.selectedTags.forEach(tag => {
      const tagPill = this.selectedTagsContainer.createEl("div", {
        cls: "tag-pill",
      })

      // Insert before the input element
      this.selectedTagsContainer.insertBefore(tagPill, this.tagInput)

      // Remove # symbol for display
      const displayTag = tag.startsWith("#") ? tag.slice(1) : tag
      const tagText = tagPill.createEl("span", {
        cls: "tag-pill-text",
        text: displayTag,
      })

      const removeButton = tagPill.createEl("div", {
        cls: "tag-pill-remove",
      })
      removeButton.textContent = "×"

      this.registerDomEvent(removeButton, "click", () => {
        this.removeTag(tag)
      })
    })

    // Check if tags have wrapped to multiple lines
    this.updateWrapperHeight()

    // Update placeholder based on selected tags
    this.updatePlaceholder()

    // Update tag highlight for keyboard navigation
    this.updateTagHighlight()

    // Update suggestions position if they're visible (input may have grown)
    if (this.suggestionsContainer.style.display !== "none") {
      this.updateSuggestionsPosition()
    }
  }

  /**
   * Update wrapper height based on content
   */
  private updateWrapperHeight(): void {
    // Use requestAnimationFrame to ensure DOM is updated before measuring
    requestAnimationFrame(() => {
      const wrapper = this.tagInputContainer.querySelector(
        ".tag-input-wrapper"
      ) as HTMLElement
      if (!wrapper) return

      // Temporarily remove height constraint to measure natural height
      const originalHeight = wrapper.style.height
      wrapper.style.height = "auto"

      // Measure the natural height
      const naturalHeight = wrapper.scrollHeight

      // Restore original height
      wrapper.style.height = originalHeight

      // Get the single-line height (input height)
      const singleLineHeight =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--input-height"
          )
        ) || 32

      // Check if content exceeds single line height
      const hasWrapped = naturalHeight > singleLineHeight + 8 // Add small buffer for padding

      if (hasWrapped) {
        wrapper.classList.add("has-wrapped-tags")
      } else {
        wrapper.classList.remove("has-wrapped-tags")
      }
    })
  }

  /**
   * Update placeholder based on selected tags count
   */
  private updatePlaceholder(): void {
    if (this.selectedTags.length === 0) {
      this.tagInput.placeholder = this.options.placeholder || ""
    } else {
      this.tagInput.placeholder = ""
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeydown(e: KeyboardEvent): void {
    const hasText = this.tagInput.value.trim().length > 0

    // Handle tag navigation when suggestions are hidden, we have selected tags, and input is empty
    if (
      this.suggestionsContainer.style.display === "none" &&
      this.selectedTags.length > 0 &&
      !hasText
    ) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          this.navigateToPreviousTag()
          break
        case "ArrowRight":
          e.preventDefault()
          this.navigateToNextTag()
          break
        case "Backspace":
          e.preventDefault()
          this.handleTagRemoval()
          break
        case "Delete":
          e.preventDefault()
          this.handleTagRemoval()
          break
        case "Escape":
          this.clearTagSelection()
          break
      }
      return
    }

    // Handle suggestion navigation when suggestions are visible
    if (this.suggestionsContainer.style.display !== "none") {
      // Get available tags (excluding already selected ones)
      const availableTags = this.filteredTags.filter(
        tag => !this.selectedTags.includes(tag)
      )

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          this.selectedSuggestionIndex = Math.min(
            this.selectedSuggestionIndex + 1,
            availableTags.length - 1
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
            // Select the currently highlighted suggestion
            this.selectTag(availableTags[this.selectedSuggestionIndex])
          } else if (availableTags.length > 0) {
            // Select the first suggestion if none is highlighted
            this.selectTag(availableTags[0])
          }
          break
        case "Escape":
          this.hideSuggestions()
          break
        // Only handle tag navigation when input is empty
        case "ArrowLeft":
          if (!hasText) {
            e.preventDefault()
            this.navigateToPreviousTag()
          }
          break
        case "ArrowRight":
          if (!hasText) {
            e.preventDefault()
            this.navigateToNextTag()
          }
          break
        case "Backspace":
          if (!hasText) {
            e.preventDefault()
            this.handleTagRemoval()
          }
          break
        case "Delete":
          if (!hasText) {
            e.preventDefault()
            this.handleTagRemoval()
          }
          break
      }
    }
  }

  /**
   * Update suggestion highlight
   */
  private updateSuggestionHighlight(): void {
    const suggestions = this.suggestionsList.querySelectorAll(".tag-suggestion")
    suggestions.forEach((el, index) => {
      if (index === this.selectedSuggestionIndex) {
        el.addClass("is-selected")
      } else {
        el.removeClass("is-selected")
      }
    })
  }

  /**
   * Navigate to the previous tag
   */
  private navigateToPreviousTag(): void {
    if (this.selectedTags.length === 0) return

    if (this.selectedTagIndex === -1) {
      // Start from the last tag
      this.selectedTagIndex = this.selectedTags.length - 1
    } else {
      // Move to previous tag
      this.selectedTagIndex = Math.max(0, this.selectedTagIndex - 1)
    }

    this.updateTagHighlight()
  }

  /**
   * Navigate to the next tag
   */
  private navigateToNextTag(): void {
    if (this.selectedTags.length === 0) return

    if (this.selectedTagIndex === -1) {
      // Start from the first tag
      this.selectedTagIndex = 0
    } else {
      // Move to next tag
      this.selectedTagIndex = Math.min(
        this.selectedTags.length - 1,
        this.selectedTagIndex + 1
      )
    }

    this.updateTagHighlight()
  }

  /**
   * Handle tag removal via keyboard
   */
  private handleTagRemoval(): void {
    if (this.selectedTags.length === 0) return

    // If no tag is selected, select the last one
    if (this.selectedTagIndex === -1) {
      this.selectedTagIndex = this.selectedTags.length - 1
      this.updateTagHighlight()
      return
    }

    // Remove the currently selected tag
    const tagToRemove = this.selectedTags[this.selectedTagIndex]
    this.removeTag(tagToRemove)

    // Adjust the selected index
    if (this.selectedTags.length === 0) {
      this.selectedTagIndex = -1
    } else if (this.selectedTagIndex >= this.selectedTags.length) {
      this.selectedTagIndex = this.selectedTags.length - 1
    }

    this.updateTagHighlight()
  }

  /**
   * Clear tag selection
   */
  private clearTagSelection(): void {
    this.selectedTagIndex = -1
    this.updateTagHighlight()
  }

  /**
   * Update tag highlight for keyboard navigation
   */
  private updateTagHighlight(): void {
    const tagPills = this.selectedTagsContainer.querySelectorAll(".tag-pill")
    tagPills.forEach((pill, index) => {
      if (index === this.selectedTagIndex) {
        pill.addClass("is-keyboard-selected")
      } else {
        pill.removeClass("is-keyboard-selected")
      }
    })
  }

  /**
   * Update clear button visibility
   */
  private updateClearButton(): void {
    this.tagClear.style.display = this.selectedTags.length > 0 ? "flex" : "none"
  }

  /**
   * Clear all selected tags
   */
  private clearAllTags(): void {
    this.selectedTags = []
    this.selectedTagIndex = -1
    this.updateSelectedTagsDisplay()
    this.updateClearButton()
    this.hideSuggestions()
    this.onTagsChange([])
  }

  /**
   * Show the tag selector
   */
  public show(): void {
    if (!this.visible) {
      this.tagContainer.style.display = "block"
      this.visible = true
      // Refresh tags when showing in case metadata cache has updated
      this.refreshAvailableTags()
      this.tagInput.focus()
    }
  }

  /**
   * Hide the tag selector
   */
  public hide(): void {
    this.tagContainer.style.display = "none"
    this.visible = false
    this.hideSuggestions()
  }

  /**
   * Clear the input and reset state
   */
  public clearInput(): void {
    this.tagInput.value = ""
    this.selectedTags = []
    this.selectedTagIndex = -1
    this.updateSelectedTagsDisplay()
    this.updateClearButton()
    this.hideSuggestions()
  }

  /**
   * Show suggestions container
   */
  private showSuggestions(): void {
    this.updateSuggestionsPosition()
    this.suggestionsContainer.style.display = "block"
  }

  /**
   * Update suggestions container position
   */
  private updateSuggestionsPosition(): void {
    // Get the input container's position
    const inputRect = this.tagInputContainer.getBoundingClientRect()

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate optimal width (match input container width)
    const width = inputRect.width

    // Calculate top position (directly below input, no offset)
    let top = inputRect.bottom + 4

    // Calculate left position (align with input container, no offset)
    let left = inputRect.left

    // Prevent overflow on the right
    if (left + width > viewportWidth) {
      left = viewportWidth - width - 8 // 8px margin from edge
    }

    // Prevent overflow on the left
    if (left < 8) {
      left = 8
    }

    // Check if suggestions would overflow bottom of viewport
    const maxHeight = 300 // matches max-height in CSS
    if (top + maxHeight > viewportHeight) {
      // Position above the input instead
      top = inputRect.top - maxHeight - 4

      // If still not enough room, position at top of viewport
      if (top < 8) {
        top = 8
      }
    }

    // Apply positioning
    this.suggestionsContainer.style.top = `${top}px`
    this.suggestionsContainer.style.left = `${left}px`
    this.suggestionsContainer.style.width = `${width}px`
  }

  /**
   * Hide suggestions container
   */
  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = "none"
    this.selectedSuggestionIndex = -1
  }

  /**
   * Get the current selected tags
   */
  public getValue(): string[] {
    return [...this.selectedTags]
  }

  /**
   * Set tags programmatically
   */
  public setValue(tags: string[]): void {
    this.selectedTags = [...tags]
    this.selectedTagIndex = -1
    this.updateSelectedTagsDisplay()
    this.updateClearButton()
    this.onTagsChange([...this.selectedTags])
  }

  /**
   * Check if the tag selector is visible
   */
  public isVisible(): boolean {
    return this.visible
  }

  /**
   * Public method to refresh available tags
   */
  public refreshTags(): void {
    this.refreshAvailableTags()
  }

  public getElement(): HTMLElement {
    return this.tagContainer
  }

  /**
   * Clean up when component is destroyed
   */
  onunload(): void {
    // Remove suggestions container from document.body
    if (this.suggestionsContainer) {
      this.suggestionsContainer.remove()
    }
  }
}
