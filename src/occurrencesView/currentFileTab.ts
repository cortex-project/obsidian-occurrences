import { OccurrenceList } from "@/components"
import OccurrencesPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { App, Component, TFile } from "obsidian"

export class CurrentFileTab extends Component {
  private containerEl: HTMLElement
  private plugin: OccurrencesPlugin
  private app: App
  private occurrenceStore: OccurrenceStore
  private currentFile: TFile | null = null
  private noOccurrencesEl: HTMLElement
  private occurrenceList: OccurrenceList
  public id: string = "current-file"

  constructor(containerEl: HTMLElement, plugin: OccurrencesPlugin) {
    super()
    this.containerEl = containerEl
    this.plugin = plugin
    this.app = plugin.app
    this.occurrenceStore = plugin.occurrenceStore
    this.noOccurrencesEl = this.containerEl.createEl("div", {
      cls: "occurrences-no-occurrences",
      text: "Not referenced in any occurrences",
    })

    // Create occurrence list element
    const occurrencesContainer = this.containerEl.createEl("div", {
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
        }
      })
    )
    this.registerEvent(
      this.occurrenceStore.on("loaded", () => {
        this.handleActiveFileChange()
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

  public hide(): void {
    this.containerEl.hide()
  }

  public show(): void {
    this.containerEl.show()
  }
}
