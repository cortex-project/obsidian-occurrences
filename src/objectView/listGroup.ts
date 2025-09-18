import { App, Component, setIcon, setTooltip } from "obsidian"
import { ObjectListItem } from "./objectListItem"

export class ListGroup extends Component {
  private app: App
  private isCollapsed: boolean
  private listItems: ObjectListItem[] = []
  private itemContainer: HTMLElement
  private headerContainer: HTMLElement
  private iconContainer: HTMLElement
  private headerTextEl: HTMLElement
  private buttonsContainer: HTMLElement
  private showCollapsible: boolean
  private showCount: boolean
  private group: HTMLElement

  constructor(
    container: Element,
    title: string,
    app: App,
    options: {
      initialCollapsed?: boolean
      collapsible?: boolean
      showCount?: boolean
      onToggle?: (collapsed: boolean) => void
    } = {}
  ) {
    super()
    this.app = app
    this.isCollapsed = options.initialCollapsed || false
    this.showCollapsible = options.collapsible !== false // Default to true
    this.showCount = options.showCount !== false // Default to true

    // Create group container
    this.group = container.createEl("div", { cls: "intent-group" })

    // Create header container
    this.headerContainer = this.group.createEl("div", {
      cls: "intent-group-header",
    })
    this.headerContainer.style.display = "flex"
    this.headerContainer.style.alignItems = "center"
    this.headerContainer.style.marginBottom = "4px"
    this.headerContainer.style.borderBottom = "1px solid var(--text-muted)"

    // Create icon container
    this.iconContainer = this.headerContainer.createEl("span", {
      cls: "intent-group-icon",
    })
    this.iconContainer.style.marginRight = "4px"
    this.iconContainer.style.display = "inline-flex"
    this.iconContainer.style.alignItems = "center"

    // Create group header text
    this.headerTextEl = this.headerContainer.createEl("small", {
      text: title + (this.showCount ? " (0)" : ""),
      cls: "intent-group-title",
    })
    this.headerTextEl.style.fontWeight = "bold"
    this.headerTextEl.style.flexGrow = "1"

    // Create buttons container
    this.buttonsContainer = this.headerContainer.createEl("div", {
      cls: "intent-group-buttons",
    })
    this.buttonsContainer.style.display = "flex"
    this.buttonsContainer.style.gap = "4px"

    // Create item container
    this.itemContainer = this.group.createEl("div", {
      cls: "intent-group-items",
    })
    this.itemContainer.style.marginTop = "4px"
    this.itemContainer.style.marginBottom = "12px"

    // Set up collapsible behavior if enabled
    if (this.showCollapsible) {
      this.headerContainer.style.cursor = "pointer"

      // Set initial collapsed state
      if (this.isCollapsed) {
        this.itemContainer.style.display = "none"
        setIcon(this.iconContainer, "chevron-right")
      } else {
        setIcon(this.iconContainer, "chevron-down")
      }

      // Add click handler for toggling
      this.headerContainer.addEventListener("click", e => {
        // Don't toggle if clicking on buttons
        if (
          e.target &&
          (e.target as HTMLElement).closest(".intent-group-buttons")
        ) {
          return
        }

        this.toggle()

        // Report the state change to controller
        if (options.onToggle) {
          options.onToggle(this.isCollapsed)
        }
      })
    }
  }

  /**
   * Add a list item to the group
   */
  public addListItem(item: ObjectListItem): this {
    this.listItems.push(item)
    this.itemContainer.appendChild(item.getContainerEl())
    this.updateCount()
    return this
  }

  /**
   * Insert a list item at a specific position in the group
   */
  public insertListItemAt(item: ObjectListItem, index: number): this {
    this.listItems.splice(index, 0, item)

    // Insert the DOM element at the correct position
    if (index === 0) {
      this.itemContainer.insertBefore(
        item.getContainerEl(),
        this.itemContainer.firstChild
      )
    } else if (index >= this.listItems.length - 1) {
      this.itemContainer.appendChild(item.getContainerEl())
    } else {
      const nextItem = this.listItems[index + 1]
      this.itemContainer.insertBefore(
        item.getContainerEl(),
        nextItem.getContainerEl()
      )
    }

    this.updateCount()
    return this
  }

  /**
   * Remove a list item from the group
   */
  public removeListItem(item: ObjectListItem): this {
    const index = this.listItems.indexOf(item)
    if (index > -1) {
      this.listItems.splice(index, 1)
      this.updateCount()
    }
    return this
  }

  /**
   * Set the icon for the group header
   */
  public setHeaderIcon(icon: string): this {
    // Create or find an icon container
    let iconEl = this.headerContainer.querySelector(".intent-group-icon-header")

    if (!iconEl) {
      // Create a new one if it doesn't exist
      iconEl = this.headerContainer.createEl("span", {
        cls: "intent-group-icon-header",
      })

      // Position it before the title
      this.headerContainer.insertBefore(iconEl, this.headerTextEl)
    }

    // Set the icon using Obsidian's utility
    setIcon(iconEl as HTMLElement, icon)

    return this
  }

  /**
   * Add a button to the group header
   */
  public addButton(icon: string, tooltip: string, onClick: () => void): this {
    const button = this.buttonsContainer.createEl("button", {
      cls: "clickable-icon intent-group-button",
      attr: { "aria-label": tooltip },
    })

    setIcon(button, icon)
    setTooltip(button, tooltip)

    button.addEventListener("click", e => {
      e.stopPropagation()
      onClick()
    })

    return this
  }

  /**
   * Toggle the collapsed state
   */
  public toggle(): this {
    this.isCollapsed = !this.isCollapsed

    if (this.isCollapsed) {
      this.itemContainer.style.display = "none"
      setIcon(this.iconContainer, "chevron-right")
    } else {
      this.itemContainer.style.display = "block"
      setIcon(this.iconContainer, "chevron-down")
    }

    return this
  }

  /**
   * Update the count in the header
   */
  private updateCount(): void {
    if (this.showCount) {
      const currentText = this.headerTextEl.textContent || ""
      const baseText = currentText.replace(/\s*\(\d+\)$/, "")
      this.headerTextEl.textContent = `${baseText} (${this.listItems.length})`
    }
  }

  /**
   * Get all list items
   */
  public getListItems(): ObjectListItem[] {
    return this.listItems
  }

  /**
   * Get the item container element
   */
  public getItemContainer(): HTMLElement {
    return this.itemContainer
  }

  /**
   * Get the root element
   */
  public getRootEl(): HTMLElement {
    return this.group
  }
}
