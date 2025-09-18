import CoretexPlugin from "@/main"
import { ObjectListItem } from "./objectListItem"
// import { OccurrenceModal } from "./occurrenceModal"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { Menu } from "obsidian"

export interface OccurrenceListItemOptions {
  showProcessIcon?: boolean
  showDate?: boolean
  showTime?: boolean
}
export class OccurrenceListItem extends ObjectListItem {
  private plugin: CoretexPlugin
  private occurrenceStore: OccurrenceStore
  private occurrence: OccurrenceObject
  private menu: Menu
  private options: OccurrenceListItemOptions

  constructor(
    occurrence: OccurrenceObject,
    containerEl: HTMLElement,
    plugin: CoretexPlugin,
    options?: OccurrenceListItemOptions
  ) {
    // Temporary adapter for Occurrence to CortexObject during Entity-only migration
    const adaptedOccurrence = {
      path: occurrence.file.path,
      file: occurrence.file,
      title: occurrence.title,
      class: "Occurrence" as const,
      properties: {
        tags: occurrence.properties.tags,
        occurredAt: occurrence.properties.occurredAt,
        toProcess: occurrence.properties.toProcess,
        participants: occurrence.properties.participants,
        intents: occurrence.properties.intents,
        location: occurrence.properties.location,
      },
    }

    super(containerEl, adaptedOccurrence, plugin.app, file => {
      plugin.app.workspace.openLinkText(file.path, "", false)
    })

    // Set default options
    this.options = {
      showProcessIcon: false,
      showDate: false,
      showTime: false,
      ...options,
    }

    this.plugin = plugin
    this.occurrenceStore = plugin.occurrenceStore
    this.occurrence = occurrence

    // Render the occurrence-specific content now that occurrence is set
    this.render()
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
}
