import CoretexPlugin from "@/main"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { ObjectOccurrences } from "./objectOccurrences"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  private headerEl: HTMLElement
  public contentEl: HTMLElement

  // Child components
  private objectOccurrences: ObjectOccurrences

  // State
  private currentFile: TFile | null = null
  // private currentObject: EntityObject | IntentObject | OccurrenceObject | null =
  //   null

  constructor(leaf: WorkspaceLeaf, plugin: CoretexPlugin) {
    super(leaf)
    this.plugin = plugin
    this.app = this.plugin.app
  }

  getViewType(): string {
    return OCCURRENCES_VIEW
  }

  getIcon(): string {
    return "calendar-range"
  }

  getDisplayText(): string {
    return "Occurrences View"
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.addClass("view-container")

    // Create header element
    this.headerEl = container.createEl("div", {
      cls: "view-header",
    })

    // Create content element
    this.contentEl = container.createEl("div", {
      cls: "view-content",
    })

    // Create object occurrences element
    const occurrencesContainer = this.contentEl.createEl("div", {
      cls: "view-content-container",
    })
    this.objectOccurrences = new ObjectOccurrences(
      this.plugin,
      occurrencesContainer
    )
    this.addChild(this.objectOccurrences)

    this.registerEvents()

    // Initial render
    this.handleActiveFileChange()
  }

  private registerEvents(): void {
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.handleActiveFileChange()
      })
    )

    this.registerEvent(
      this.app.workspace.on("file-open", (file: TFile) => {
        this.handleActiveFileChange()
      })
    )

    this.registerEvent(
      this.app.vault.on("rename", (file: TFile) => {
        if (this.currentFile === file) {
          // this.editableHeader.setValue(file.basename).enable()
        }
      })
    )
  }

  /**
   * Handle when the active file changes in the workspace
   */
  private async handleActiveFileChange(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile()

    // No active file
    if (!activeFile) {
      this.currentFile = null
      // this.currentObject = null
      return
    }

    this.currentFile = activeFile

    this.objectOccurrences.update(activeFile)
  }

  async onClose(): Promise<void> {
    // Cleanup will be handled automatically by ItemView for registered child components
  }
}
