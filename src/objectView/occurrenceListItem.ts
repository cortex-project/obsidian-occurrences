import CoretexPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { App, Menu, TFile, setTooltip } from "obsidian"
import { ListItem } from "./listItem"

export interface OccurrenceListItemOptions {
  showProcessIcon?: boolean
  showDate?: boolean
  showTime?: boolean
}

export class OccurrenceListItem extends ListItem<OccurrenceObject> {
  private plugin: CoretexPlugin
  private occurrenceStore: OccurrenceStore
  private occurrence: OccurrenceObject
  private menu: Menu
  private options: OccurrenceListItemOptions
  private app: App

  constructor(
    occurrence: OccurrenceObject,
    containerEl: HTMLElement,
    plugin: CoretexPlugin,
    options?: OccurrenceListItemOptions
  ) {
    // Call parent constructor with the occurrence and display text
    super(containerEl, occurrence, occurrence.title, file =>
      plugin.app.workspace.openLinkText(file.file.path, "", false)
    )

    this.app = plugin.app
    this.plugin = plugin
    this.occurrenceStore = plugin.occurrenceStore
    this.occurrence = occurrence

    // Set default options
    this.options = {
      showProcessIcon: false,
      showDate: false,
      showTime: false,
      ...options,
    }

    // Add tooltip using Obsidian's native approach
    setTooltip(this.getContainerEl(), occurrence.title)

    // Add file-specific event handlers
    this.setupFileHandlers()

    // Render the occurrence-specific content now that occurrence is set
    this.render()
  }

  /**
   * Setup file-specific event handlers
   */
  private setupFileHandlers(): void {
    const containerEl = this.getContainerEl()

    // Remove the default click handler and add our own
    containerEl.removeEventListener("click", this.handleClick)

    // Open file on click using Obsidian's native link handling
    containerEl.addEventListener("click", (event: MouseEvent) => {
      // Prevent default to avoid any unwanted behavior
      event.preventDefault()

      // Default behavior: open the file
      this.app.workspace.openLinkText(this.occurrence.file.path, "", false)
    })

    // Add hover preview functionality
    containerEl.addEventListener("mouseover", (event: MouseEvent) => {
      this.app.workspace.trigger("hover-link", {
        event: event,
        source: "file-explorer",
        hoverParent: containerEl,
        targetEl: containerEl,
        linktext: this.occurrence.file.path,
      })
    })
  }

  /**
   * Dummy click handler for removal
   */
  private handleClick = () => {}

  private configureMenu() {
    // Open file option
    this.menu.addItem(item => {
      item
        .setTitle("Open File")
        .setIcon("file-symlink")
        .onClick(() =>
          this.plugin.app.workspace.openLinkText(
            this.occurrence.file.path,
            "",
            false
          )
        )
    })
    // Open modal option
    this.menu.addItem(item => {
      item
        .setTitle("Open Modal")
        .setIcon("square-arrow-up-left")
        .onClick(() => {
          // new OccurrenceModal(this.plugin, this.occurrence).open()
        })
    })
    // Delete occurrence option
    this.menu.addSeparator()
    this.menu.addItem(item => {
      item
        .setTitle("Delete Occurrence")
        .setIcon("trash")
        .onClick(() => {
          this.occurrenceStore.delete(this.occurrence.file.path)
        })
      // Add a danger class to the item for styling
      const itemDom = (item as any).dom as HTMLElement
      if (itemDom) {
        itemDom.addClass("menu-item-danger")
      }
    })
  }

  /**
   * Render the occurrence list item with all its content
   */
  public render(): void {
    // Call parent render to set up basic structure
    super.render()

    // If occurrence is not set yet, just return (this can happen during construction)
    if (!this.occurrence) {
      return
    }

    // Create menu to be used for right click and option button
    this.menu = new Menu()
    this.configureMenu()

    // Add to process icon if enabled
    if (this.options.showProcessIcon) {
      this.addIconBefore(
        this.occurrence.properties.toProcess ? "circle-dashed" : "circle-dot"
      )
    }

    // Add location icon
    if (this.occurrence.properties.location) {
      this.addIconAfter("map-pin")
    }

    // Add participant icons
    if (this.occurrence.properties.participants.length) {
      if (this.occurrence.properties.participants.length === 1) {
        this.addIconAfter("user")
      } else {
        this.addIconAfter("users")
      }
    }

    // Add intent icons
    if (this.occurrence.properties.intents.length) {
      if (this.occurrence.properties.intents.length === 1) {
        this.addIconAfter("square-check")
      } else {
        this.addIconAfter("list-todo")
      }
    }

    // Add date and time if enabled
    if (this.options.showDate) {
      const dateStr = this.occurrence.properties.occurredAt.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      )
      // Pad with spaces to ensure consistent column width (assuming max 5 chars like "Jan 15")
      const paddedDate = dateStr.padEnd(5, " ")
      this.addTextRight(paddedDate)
    }

    if (this.options.showTime) {
      this.addTextRight(
        this.occurrence.properties.occurredAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      )
    }

    this.addFileButton("ellipsis-vertical", "Options", (file, event) => {
      this.menu.showAtMouseEvent(event)
    })

    // Add context menu
    this.getContainerEl().addEventListener(
      "contextmenu",
      (event: MouseEvent) => {
        event.preventDefault()
        this.menu.showAtMouseEvent(event)
      }
    )
  }

  /**
   * Update this list item with new occurrence data and re-render its display.
   * @param {OccurrenceObject} occurrence - The updated occurrence data.
   */
  public update(occurrence: OccurrenceObject) {
    this.occurrence = occurrence
    this.render()
  }

  public getOccurrence(): OccurrenceObject {
    return this.occurrence
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
      (occurrence: OccurrenceObject, event: MouseEvent) => {
        onClick(occurrence.file, event)
      }
    )
    return this
  }

  /**
   * Check if this list item represents the given file
   */
  public isForFile(file: TFile): boolean {
    return this.occurrence.file.path === file.path
  }

  /**
   * Get the file associated with this list item
   * @returns The file
   */
  public getFile(): TFile {
    return this.occurrence.file
  }

  /**
   * Get the OccurrenceObject associated with this list item
   * @returns The OccurrenceObject
   */
  public getFileItem(): OccurrenceObject {
    return this.occurrence
  }
}
