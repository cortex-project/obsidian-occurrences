import { OccurrenceStore } from "@/occurrenceStore"
import { App, Component } from "obsidian"
import { FilterControls } from "./components/filterControls"
import { Summary } from "./components/summary"
import { FilterService } from "./services/filterService"
import { FilterChangeCallback, SearchFilters, SearchMetadata } from "./types"

export class Header extends Component {
  private headerEl: HTMLElement
  private filterControls: FilterControls
  private summary: Summary
  private filterService: FilterService
  private onFilterChange: FilterChangeCallback
  private app: App
  private occurrenceStore: OccurrenceStore

  constructor(
    container: HTMLElement,
    app: App,
    occurrenceStore: OccurrenceStore,
    filterService: FilterService,
    onFilterChange: FilterChangeCallback
  ) {
    super()
    this.app = app
    this.occurrenceStore = occurrenceStore
    this.onFilterChange = onFilterChange
    this.filterService = filterService

    this.headerEl = container.createEl("div", {
      cls: "occurrences-view-header",
    })

    this.render()
  }

  private render(): void {
    // Create nav-header wrapper (matches built-in tags view structure)
    const navHeader = this.headerEl.createEl("div", {
      cls: "nav-header",
    })

    // Create filter controls
    this.filterControls = new FilterControls(
      navHeader,
      this.app,
      this.occurrenceStore,
      this.filterService
    )
    this.addChild(this.filterControls)

    // Create summary component
    this.summary = new Summary(this.headerEl, this.app)
    this.addChild(this.summary)
  }

  /**
   * Get current filter state
   */
  public getFilters(): SearchFilters {
    return this.filterService.getFilters()
  }

  /**
   * Update active file in file selector
   */
  public updateActiveFile(): void {
    this.filterControls.updateActiveFile()
  }

  /**
   * Sync filter controls UI with current filter state
   */
  public syncFilterControls(): void {
    this.filterControls.syncWithFilterState()
  }

  /**
   * Update the summary display with new data
   */
  public updateSummary(
    totalCount: number,
    metadata: SearchMetadata,
    pagination?: { offset: number; limit: number }
  ): void {
    this.summary.updateSummary(totalCount, metadata, pagination)
  }

  public getElement(): HTMLElement {
    return this.headerEl
  }
}
