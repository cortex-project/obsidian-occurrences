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
    this.containerEl = containerEl.createEl("div")
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

    // Wait for occurrence store to initialize before searching
    if (!this.plugin.occurrenceStore.isLoaded) {
      this.noOccurrencesEl.show()
      this.noOccurrencesEl.setText("Loading occurrences...")

      // Retry after a short delay
      setTimeout(() => {
        this.updateOccurrences(file)
      }, 100)
      return
    }

    //Search for occurrences that link to this file
    const searchResult = this.plugin.occurrenceStore.search({
      linksTo: file.path,
    })

    if (searchResult.items.length === 0) {
      this.noOccurrencesEl.setText("No occurrences found")
      this.noOccurrencesEl.show()
      return
    }

    // Add occurrences to the list
    for (const occurrence of searchResult.items) {
      this.occurrenceList.addItem(occurrence)
    }
  }

  public hide(): void {
    this.containerEl.hide()
  }

  public show(): void {
    this.containerEl.show()
  }
}
