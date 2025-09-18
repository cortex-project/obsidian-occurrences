import OccurrencesPlugin from "@/main"
import { Component, TFile } from "obsidian"
import { OccurrenceList } from "./occurrenceList"

export class ObjectOccurrences extends Component {
  private plugin: OccurrencesPlugin
  private containerEl: HTMLElement
  private occurrenceList: OccurrenceList

  constructor(plugin: OccurrencesPlugin, containerEl: HTMLElement) {
    super()
    this.plugin = plugin
    this.containerEl = containerEl

    // Create occurrence list and bind for cleanup
    this.occurrenceList = new OccurrenceList(plugin, containerEl, {
      listItemOptions: {
        showDate: true,
      },
      groupBy: "month",
    })
    this.addChild(this.occurrenceList)

    this.containerEl.empty()
    this.containerEl.addClass("cortex-occurrence-list")
  }

  /**
   * Update the occurrences display for a given file
   * @param file - The file to find inbound occurrence links for
   */
  public update(file: TFile): void {
    this.containerEl.empty()
    // Clear existing occurrences
    this.occurrenceList.empty()

    // Get all inbound links to this file
    const inboundLinks = this.getInboundLinks(file.path)

    if (inboundLinks.length === 0) {
      this.renderNoOccurrences()
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

  /**
   * Render the "no occurrences" message
   */
  private renderNoOccurrences(): void {
    this.containerEl.empty()
    this.containerEl.addClass("cortex-occurrence-list")

    const noOccurrencesEl = this.containerEl.createEl("div", {
      cls: "cortex-no-occurrences",
      text: "Not referenced in any occurrences",
    })
  }
}
