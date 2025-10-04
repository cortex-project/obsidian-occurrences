import CoretexPlugin from "@/main"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { OccurrenceList } from "./occurrenceList"
import { Header, SearchFilters } from "./header"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  private headerEl: HTMLElement
  public contentEl: HTMLElement

  // Child components
  private header: Header
  private occurrenceList: OccurrenceList
  private noOccurrencesEl: HTMLElement

  // State
  private currentFile: TFile | null = null
  private currentFilters: SearchFilters = {
    search: false,
    searchQuery: "",
    currentFile: false,
    inbox: false,
    linksTo: false,
    linksToFile: null,
    linksToIsCurrentFile: false,
  }

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
      cls: "occurrences-view-header-container",
    })

    // Create header component
    this.header = new Header(
      this.app,
      this.headerEl,
      (filters: SearchFilters) => {
        this.handleFilterChange(filters)
      }
    )
    this.addChild(this.header)

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
   * Handle filter changes from the header
   */
  private handleFilterChange(filters: SearchFilters): void {
    this.currentFilters = { ...filters }
    
    // Determine which file to get occurrences for
    let targetFile: TFile | null = null
    
    if (filters.linksTo && filters.linksToFile) {
      // Use the selected links to file
      targetFile = filters.linksToFile
    } else if (filters.currentFile || (!filters.linksTo && this.currentFile)) {
      // Use current active file
      targetFile = this.currentFile
    }
    
    if (targetFile) {
      this.updateOccurrences(targetFile)
    } else {
      this.occurrenceList.empty()
      this.noOccurrencesEl.show()
    }
  }

  /**
   * Handle when the active file changes in the workspace
   */
  private async handleActiveFileChange(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile()

    // No active file
    if (!activeFile) {
      this.currentFile = null
      // If no active file and current file filter is on, clear occurrences
      if (this.currentFilters.currentFile) {
        this.occurrenceList.empty()
        this.noOccurrencesEl.show()
      }
      return
    }

    this.currentFile = activeFile

    // If current file filter is active or no specific links to file selected, update occurrences
    if (this.currentFilters.currentFile || 
        (!this.currentFilters.linksTo || !this.currentFilters.linksToFile)) {
      this.updateOccurrences(activeFile)
    }
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

    if (inboundLinks.length === 0) {
      this.noOccurrencesEl.show()
      return
    }

    let filteredOccurrences = []

    // Add occurrences for each inbound link
    for (const linkPath of inboundLinks) {
      const occurrence = this.plugin.occurrenceStore.get(linkPath)
      if (occurrence) {
        // Apply filters
        let includeOccurrence = true

        // Apply search filter
        if (this.currentFilters.search && this.currentFilters.searchQuery) {
          const query = this.currentFilters.searchQuery.toLowerCase()
          const searchText = `${occurrence.title} ${occurrence.content || ""}`.toLowerCase()
          if (!searchText.includes(query)) {
            includeOccurrence = false
          }
        }

        // Apply inbox filter
        if (this.currentFilters.inbox) {
          // Assuming occurrences have some inbox property or tag
          // You may need to adjust this based on your data structure
          const hasInboxTag = occurrence.tags?.includes("inbox") || 
                              occurrence.frontmatter?.inbox === true
          if (!hasInboxTag) {
            includeOccurrence = false
          }
        }

        if (includeOccurrence) {
          filteredOccurrences.push(occurrence)
        }
      }
    }

    if (filteredOccurrences.length === 0) {
      this.noOccurrencesEl.show()
      return
    }

    // Add filtered occurrences to the list
    for (const occurrence of filteredOccurrences) {
      this.occurrenceList.addItem(occurrence)
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
