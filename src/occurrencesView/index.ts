import CoretexPlugin from "@/main"
import { ItemView, WorkspaceLeaf } from "obsidian"
import { CurrentFileTab } from "./currentFileTab"
import { Header } from "./header"

export const OCCURRENCES_VIEW = "occurrences-view"

export class OccurrencesView extends ItemView {
  private plugin: CoretexPlugin
  // UI elements
  public contentEl: HTMLElement

  // Child components
  private header: Header
  private currentFileTab: CurrentFileTab
  // private searchTab: SearchTab
  // private inboxTab: InboxTab

  // State
  private currentView: "search" | "current-file" | "inbox"

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
    return "Occurrences"
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.addClass("occurrences-view-container")

    // Create header element
    this.header = new Header(container as HTMLElement, tab =>
      this.handleTabChange(tab)
    )
    this.addChild(this.header)

    // Create content element
    this.contentEl = container.createEl("div", {
      cls: "view-content",
    })

    this.currentFileTab = new CurrentFileTab(this.contentEl, this.plugin)
    this.addChild(this.currentFileTab)

    this.handleTabChange("current-file")
  }

  private handleTabChange(tab: "current-file" | "search" | "inbox"): void {
    // If the tab is already active, do nothing
    if (this.currentView === tab) return

    // Set the current view
    this.currentView = tab

    // Set the active button in header
    this.header.setActiveTab(tab)

    // Set the active tab
    const tabs = [
      this.currentFileTab,
      // this.searchTab,
      // this.inboxTab,
    ]
    tabs.forEach(tabComponent => tabComponent.hide())
    tabs.find(tabComponent => tabComponent.id === tab)?.show()
  }

  async onClose(): Promise<void> {
    // Cleanup will be handled automatically by ItemView for registered child components
  }
}
