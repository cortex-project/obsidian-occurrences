import CoretexPlugin from "@/main"
import { ItemView, TFile, WorkspaceLeaf } from "obsidian"
import { OccurrenceList } from "./occurrenceList"
import { Header, SearchFilters } from "./header"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  public contentEl: HTMLElement

  // Child components
  private header: Header
  private occurrenceList: OccurrenceList
  private noOccurrencesEl: HTMLElement

  // State
  private currentFile: TFile | null = null
  private filters: SearchFilters = {
    search: false,
    searchQuery: "",
    fileSelector: false,
    selectedFilePath: null,
    isCurrentFileMode: false,
    inbox: false,
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

    // Create header component
    const headerContainer = container.createEl("div")
    this.header = new Header(
      this.app,
      headerContainer,
      (filters: SearchFilters) => {
        this.onFiltersChange(filters)
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
          // Handle file rename if needed
        }
      })
    )
  }

  /**
   * Handle filter changes from the header component
   */
  private onFiltersChange(filters: SearchFilters): void {
    this.filters = filters
    
    // Update occurrences based on new filters
    if (filters.isCurrentFileMode || (!filters.fileSelector && this.currentFile)) {
      // Show occurrences for current file
      this.updateOccurrences(this.currentFile)
    } else if (filters.selectedFilePath) {
      // Show occurrences for selected file
      const selectedFile = this.app.vault.getAbstractFileByPath(filters.selectedFilePath)
      if (selectedFile instanceof TFile) {
        this.updateOccurrences(selectedFile)
      }
    } else {
      // Clear occurrences when no file is selected
      this.clearOccurrences()
    }
  }

  /**
   * Handle when the active file changes in the workspace
   */
  private async handleActiveFileChange(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile()
    this.currentFile = activeFile

    // If in current file mode or no file selector is active, update occurrences
    if (this.filters.isCurrentFileMode || !this.filters.fileSelector) {
      if (activeFile) {
        this.updateOccurrences(activeFile)
      } else {
        this.clearOccurrences()
      }
    }

    // Notify header about active file change
    if (this.header) {
      this.header.onActiveFileChange()
    }
  }

  /**
   * Clear all occurrences and show the no occurrences message
   */
  private clearOccurrences(): void {
    this.occurrenceList.empty()
    this.noOccurrencesEl.show()
  }

  /**
   * Update the occurrences display for a given file
   * @param file - The file to find inbound occurrence links for
   */
  private updateOccurrences(file: TFile | null): void {
    // Clear existing occurrences
    this.occurrenceList.empty()
    this.noOccurrencesEl.hide()

    if (!file) {
      this.noOccurrencesEl.show()
      return
    }

    // Get all inbound links to this file
    const inboundLinks = this.getInboundLinks(file.path)
    
    if (inboundLinks.length === 0) {
      this.noOccurrencesEl.show()
      return
    }

    // Filter and add occurrences
    let filteredOccurrences = 0
    
    for (const linkPath of inboundLinks) {
      const occurrence = this.plugin.occurrenceStore.get(linkPath)
      if (occurrence && this.shouldIncludeOccurrence(occurrence)) {
        this.occurrenceList.addItem(occurrence)
        filteredOccurrences++
      }
    }

    if (filteredOccurrences === 0) {
      this.noOccurrencesEl.show()
    }
  }

  /**
   * Check if an occurrence should be included based on current filters
   */
  private shouldIncludeOccurrence(occurrence: any): boolean {
    // Apply search filter
    if (this.filters.search && this.filters.searchQuery) {
      const query = this.filters.searchQuery.toLowerCase()
      const fileName = occurrence.file?.basename?.toLowerCase() || ""
      const content = occurrence.content?.toLowerCase() || ""
      
      if (!fileName.includes(query) && !content.includes(query)) {
        return false
      }
    }

    // Apply inbox filter
    if (this.filters.inbox) {
      // Add logic for inbox filtering if needed
      // For now, we'll just include all occurrences
    }

    return true
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
