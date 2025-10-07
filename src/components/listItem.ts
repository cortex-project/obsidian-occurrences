import { Component, setIcon, setTooltip } from "obsidian"

export class ListItem<T = string> extends Component {
  protected containerEl: HTMLElement
  private titleRowEl: HTMLElement
  private titleEl: HTMLElement
  private descriptionEl: HTMLElement | null = null
  private item: T

  constructor(
    containerEl: Element,
    item: T,
    displayText: string,
    onClick?: (item: T) => void
  ) {
    super()
    this.item = item

    // Create the list item container with appropriate classes
    this.containerEl = containerEl.createEl("div", {
      cls: "list-item nav-file-title is-clickable",
    })

    // Create title row for the layout
    this.titleRowEl = this.containerEl.createEl("div", {
      cls: "list-item-title-row",
    })

    // Store the display text for rendering
    this.titleEl = this.titleRowEl.createEl("span", {
      text: displayText,
      cls: "nav-file-title-content",
    })

    // Add click handler if provided
    if (onClick) {
      this.registerDomEvent(this.containerEl, "click", (event: MouseEvent) => {
        event.preventDefault()
        onClick(item)
      })
    }

    // Style the list item
    this.containerEl.style.display = "flex"
    this.containerEl.style.alignItems = "center"
    this.containerEl.style.justifyContent = "space-between"
    this.containerEl.style.padding = "4px 8px"
    this.containerEl.style.marginBottom = "2px"
    this.containerEl.style.borderRadius = "4px"
  }

  /**
   * Render the list item content. This method can be overridden by subclasses
   * to add custom content, and can be called to rebuild the item.
   */
  public render(): void {
    // This method can be overridden by subclasses for custom rendering
    // The basic rendering is handled in the constructor
  }

  /**
   * Add an icon before the title
   */
  public addIconBefore(icon: string): this {
    const iconEl = createEl("span", {
      cls: "list-item-icon",
    })
    setIcon(iconEl, icon)
    this.titleRowEl.prepend(iconEl)
    return this
  }

  /**
   * Add an icon after the title
   */
  public addIconAfter(icon: string): this {
    const iconEl = this.titleRowEl.createEl("span", {
      cls: "list-item-icon icon-sm",
    })
    setIcon(iconEl, icon)
    return this
  }

  /**
   * Add text content to the right section of the title row
   */
  public addTextRight(text: string, className?: string): this {
    // Create right section container if it doesn't exist
    let rightSection = this.titleRowEl.querySelector(
      ".list-item-right-section"
    ) as HTMLElement
    if (!rightSection) {
      rightSection = this.titleRowEl.createEl("div", {
        cls: "list-item-right-section",
      })
    }

    const textEl = rightSection.createEl("span", {
      cls: `list-item-text-right ${className || ""}`,
      text: text,
    })

    return this
  }

  /**
   * Add a button to the right section (after any text)
   */
  public addButton(
    icon: string,
    tooltip: string,
    onClick: (item: T, event: MouseEvent) => void
  ): this {
    // Create right section container if it doesn't exist
    let rightSection = this.titleRowEl.querySelector(
      ".list-item-right-section"
    ) as HTMLElement
    if (!rightSection) {
      rightSection = this.titleRowEl.createEl("div", {
        cls: "list-item-right-section",
      })
    }

    // Create button container within right section if it doesn't exist
    let buttonContainer = rightSection.querySelector(
      ".list-item-buttons"
    ) as HTMLElement
    if (!buttonContainer) {
      buttonContainer = rightSection.createEl("div", {
        cls: "list-item-buttons",
      })
    }

    const buttonEl = buttonContainer.createEl("button", {
      cls: "list-item-button clickable-icon",
      attr: {
        "aria-label": tooltip,
      },
    })

    setIcon(buttonEl, icon)
    setTooltip(buttonEl, tooltip)

    this.registerDomEvent(buttonEl, "click", event => {
      event.stopPropagation()
      onClick(this.item, event)
    })

    return this
  }

  /**
   * Add a text description below the title
   */
  public addDescription(text: string): this {
    if (!this.descriptionEl) {
      this.descriptionEl = this.containerEl.createEl("div", {
        cls: "list-item-description",
      })
    }

    this.descriptionEl.setText(text)
    return this
  }

  /**
   * Add HTML content below the title
   */
  public addDetails(callback: (el: HTMLElement) => void): this {
    if (!this.descriptionEl) {
      this.descriptionEl = this.containerEl.createEl("div", {
        cls: "list-item-description",
      })
    }

    callback(this.descriptionEl)
    return this
  }

  /**
   * Update the active state of this list item
   */
  public setActive(isActive: boolean): this {
    if (isActive) {
      this.containerEl.addClass("is-active")
    } else {
      this.containerEl.removeClass("is-active")
    }
    return this
  }

  /**
   * Get the item value
   */
  public getItem(): T {
    return this.item
  }

  /**
   * Get the container element for this list item
   */
  public getContainerEl(): HTMLElement {
    return this.containerEl
  }

  /**
   * Get the title row element for extending classes
   */
  protected getTitleRowEl(): HTMLElement {
    return this.titleRowEl
  }

  /**
   * Get the title element for extending classes
   */
  protected getTitleEl(): HTMLElement {
    return this.titleEl
  }
}
