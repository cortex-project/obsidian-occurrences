import { OccurrenceList, OccurrenceListItem } from "@/components"
import OccurrencesPlugin from "@/main"
import { OccurrenceStore } from "@/occurrenceStore"
import { OccurrenceObject } from "@/types"
import { Component } from "obsidian"

export class SearchTab extends Component {
  private containerEl: HTMLElement
  private plugin: OccurrencesPlugin
  private occurrenceStore: OccurrenceStore
  private occurrenceList: OccurrenceList
  private occurrenceListItems: Map<string, OccurrenceListItem> = new Map()
  private occurrences: OccurrenceObject[] = []
  public id: string = "search"

  constructor(containerEl: HTMLElement, plugin: OccurrencesPlugin) {
    super()
    this.containerEl = containerEl.createEl("div")
    this.plugin = plugin
    this.occurrenceStore = plugin.occurrenceStore

    // Create occurrence list element
    const occurrencesContainer = this.containerEl.createEl("div", {
      cls: "occurrences-view-content-container",
    })
    this.occurrenceList = new OccurrenceList(
      this.plugin,
      occurrencesContainer,
      {
        groupBy: "day",
        listItemOptions: {
          showTime: true,
          showProcessIcon: true,
        },
      }
    )
    this.addChild(this.occurrenceList)

    if (this.occurrenceStore.isLoaded) {
      this.loadAndRenderOccurrences()
    }

    this.registerEvents()
  }

  private registerEvents(): void {
    this.registerEvent(
      this.occurrenceStore.on("loaded", () => {
        this.loadAndRenderOccurrences()
      })
    )
    this.registerEvent(
      this.occurrenceStore.on("item-updated", occurrence => {
        if (this.occurrenceListItems.get(occurrence.file.path)) {
          this.occurrenceListItems.delete(occurrence.file.path)
          this.occurrenceList.removeItem(occurrence.file.path)
          const listItem = this.occurrenceList.addItem(occurrence)
          this.occurrenceListItems.set(occurrence.file.path, listItem)
        }
      })
    )
  }

  private loadAndRenderOccurrences(): void {
    this.occurrenceListItems.clear()
    this.occurrenceList.empty()
    this.occurrences = this.occurrenceStore.search({
      query: "",
    }).items
    for (const occurrence of this.occurrences) {
      const listItem = this.occurrenceList.addItem(occurrence)
      this.occurrenceListItems.set(occurrence.file.path, listItem)
    }
  }

  public hide(): void {
    this.containerEl.hide()
  }

  public show(): void {
    this.containerEl.show()
    this.loadAndRenderOccurrences()
  }
}
