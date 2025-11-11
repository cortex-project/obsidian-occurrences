import { ListItem } from "./listItem"
import OccurrencesPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { App, Menu, TFile, setTooltip } from "obsidian"

export class OccurrenceListItem extends ListItem<OccurrenceObject> {
  private plugin: OccurrencesPlugin
  private occurrenceStore: OccurrenceStore
  private occurrence: OccurrenceObject
  private menu: Menu
  private showDate: boolean
  private showTime: boolean
  private app: App

  constructor(
    occurrence: OccurrenceObject,
    containerEl: HTMLElement,
    plugin: OccurrencesPlugin,
    showDate: boolean = false,
    showTime: boolean = false
  ) {
    // Call parent constructor with the occurrence and display text
    // Note: onClick is handled in setupFileHandlers() to support cmd+click for new tabs
    super(containerEl, occurrence, occurrence.title)

    this.app = plugin.app
    this.plugin = plugin
    this.occurrenceStore = plugin.occurrenceStore
    this.occurrence = occurrence
    this.showDate = showDate
    this.showTime = showTime

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

    // Open file on click using Obsidian's native link handling
    this.registerDomEvent(containerEl, "click", (event: MouseEvent) => {
      // Prevent default to avoid any unwanted behavior
      event.preventDefault()

      // Check if cmd (Mac) or ctrl (Windows/Linux) is pressed for new tab
      const openInNewTab = event.metaKey || event.ctrlKey

      // Open the file (in new tab if modifier key is pressed)
      this.app.workspace.openLinkText(
        this.occurrence.file.path,
        "",
        openInNewTab
      )
    })

    // Add hover preview functionality
    this.registerDomEvent(containerEl, "mouseover", (event: MouseEvent) => {
      this.app.workspace.trigger("hover-link", {
        event: event,
        source: "file-explorer",
        hoverParent: containerEl,
        targetEl: containerEl,
        linktext: this.occurrence.file.path,
      })
    })
  }

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
    // Open file in new tab option
    this.menu.addItem(item => {
      item
        .setTitle("Open File in New Tab")
        .setIcon("arrow-up-right")
        .onClick(() =>
          this.plugin.app.workspace.openLinkText(
            this.occurrence.file.path,
            "",
            true
          )
        )
    })
    // Delete occurrence option
    this.menu.addSeparator()
    this.menu.addItem(item => {
      item
        .setTitle("Delete Occurrence")
        .setIcon("trash")
        .onClick(() => {
          this.occurrenceStore.remove(this.occurrence.file.path)
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

    // Apply font variation for toProcess items instead of icons
    if (this.occurrence.properties.toProcess) {
      this.getTitleEl().addClass("occurrence-to-process")
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
    if (this.showDate) {
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

    if (this.showTime) {
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
    this.registerDomEvent(
      this.getContainerEl(),
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

