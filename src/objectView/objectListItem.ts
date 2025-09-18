import { CortexObject } from "@/types"
import { App, Menu, TFile, setTooltip } from "obsidian"
import { ListItem } from "./listItem"

export type MenuHandler = (menu: Menu, file: TFile) => void

export class ObjectListItem extends ListItem<CortexObject> {
  private app: App
  private menuHandlers: MenuHandler[] = []

  constructor(
    containerEl: Element,
    item: CortexObject,
    app: App,
    onClick?: (file: TFile) => void
  ) {
    // Call parent constructor with the item and display text
    super(
      containerEl,
      item,
      item.title,
      onClick ? coreItem => onClick(coreItem.file) : undefined
    )

    this.app = app

    // Add tooltip using Obsidian's native approach
    setTooltip(this.getContainerEl(), item.title)

    // Add file-specific event handlers
    this.setupFileHandlers(onClick)
  }

  /**
   * Setup file-specific event handlers
   */
  private setupFileHandlers(onClick?: (file: TFile) => void): void {
    const containerEl = this.getContainerEl()

    // Remove the default click handler and add our own
    containerEl.removeEventListener("click", this.handleClick)

    // Open file on click using Obsidian's native link handling
    containerEl.addEventListener("click", (event: MouseEvent) => {
      // Prevent default to avoid any unwanted behavior
      event.preventDefault()

      // Call custom onClick handler if provided
      if (onClick) {
        onClick(this.getItem().file)
        return
      }

      // Default behavior: open the file
      this.app.workspace.openLinkText(this.getItem().file.path, "", false)
    })

    // Add hover preview functionality
    containerEl.addEventListener("mouseover", (event: MouseEvent) => {
      this.app.workspace.trigger("hover-link", {
        event: event,
        source: "file-explorer",
        hoverParent: containerEl,
        targetEl: containerEl,
        linktext: this.getItem().file.path,
      })
    })

    // Add context menu support
    containerEl.addEventListener("contextmenu", (event: MouseEvent) => {
      event.preventDefault()

      const menu = new Menu()

      // Call all registered menu handlers
      this.menuHandlers.forEach(handler => handler(menu, this.getItem().file))

      // Only show the menu if items have been added
      if ((menu as any).items?.length > 0) {
        menu.showAtMouseEvent(event)
      }
    })
  }

  /**
   * Add a button with file-specific callback signature
   */
  public addFileButton(
    icon: string,
    tooltip: string,
    onClick: (file: TFile, event: MouseEvent) => void
  ): this {
    // Use the parent's addButton but adapt the callback
    super.addButton(
      icon,
      tooltip,
      (coreItem: CortexObject, event: MouseEvent) => {
        onClick(coreItem.file, event)
      }
    )
    return this
  }

  /**
   * Register a handler that will be called when the context menu is shown
   * @param handler A function that configures the context menu
   * @returns The ObjectListItem instance for chaining
   */
  public registerMenuHandler(handler: MenuHandler): this {
    this.menuHandlers.push(handler)
    return this
  }

  /**
   * Check if this list item represents the given file
   */
  public isForFile(file: TFile): boolean {
    return this.getItem().file.path === file.path
  }

  /**
   * Get the file associated with this list item
   * @returns The file
   */
  public getFile(): TFile {
    return this.getItem().file
  }

  /**
   * Get the CortexObject associated with this list item
   * @returns The CortexObject
   */
  public getFileItem(): CortexObject {
    return this.getItem()
  }

  /**
   * Dummy click handler for removal
   */
  private handleClick = () => {}
}
