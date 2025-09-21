import CoretexPlugin from "@/main"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { OccurrenceList } from "./occurrenceList"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  private headerEl: HTMLElement
  public contentEl: HTMLElement

  // Child components
  private occurrenceList: OccurrenceList
  private noOccurrencesEl: HTMLElement

  // State
  private currentFile: TFile | null = null

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
      cls: "occurrences-view-header",
    })

    // Create content element
    this.contentEl = container.createEl("div", {
      cls: "occurrences-view-content",
    })

    this.noOccurrencesEl = this.contentEl.createEl("div", {
      cls: "occurrences-no-occurrences",
      text: "Not referenced in any occurrences",
    })

    // Create occurrence list element
    const occurrencesContainer = this.contentEl.createEl("div", {
      cls: "occurrences-view-content-container",
    })
    this.occurrenceList = new OccurrenceList(
      this.plugin,
      occurrencesContainer,
      {
        listItemOptions: {
          showDate: true,
        },
        groupBy: "month",
      }
    )
    this.addChild(this.occurrenceList)

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

    this.updateOccurrences(activeFile)
  }

  /**
   * Update the occurrences display for a given file
   * @param file - The file to find inbound occurrence links for
   */
  private updateOccurrences(file: TFile): void {
    // Clear existing occurrences
    this.occurrenceList.empty()
    this.noOccurrencesEl.hide()

    // Get all inbound links to this file
    const inboundLinks = this.getInboundLinks(file.path)
    // TODO: Modify so that items are added to the list as they are found rather
    // than after all links are found

    if (inboundLinks.length === 0) {
      this.noOccurrencesEl.show()
      return
    }

    // Add occurrences for each inbound link
    for (const linkPath of inboundLinks) {
      const occurrence = this.plugin.occurrenceStore.get(linkPath)
      if (occurrence) {
        this.occurrenceList.addItem(occurrence)
      }
      // Silently skip if occurrence doesn't exist
    }
  }

  /**
   * Get all file paths that link to the given file path
   * @param targetPath - The file path to find inbound links for
   * @returns Array of file paths that link to the target
   */
  private getInboundLinks(targetPath: string): string[] {
    const inboundLinks: string[] = []

    // Iterate over all resolved links to find those pointing to our target
    const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks
    for (const sourcePath in resolvedLinks) {
      const links = resolvedLinks[sourcePath]
      if (links[targetPath]) {
        inboundLinks.push(sourcePath)
      }
    }

    return inboundLinks
  }

  async onClose(): Promise<void> {
    // Cleanup will be handled automatically by ItemView for registered child components
  }
}
