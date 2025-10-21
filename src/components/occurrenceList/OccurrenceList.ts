import { ListGroup } from "@/components"
import OccurrencesPlugin from "@/main"
import { OccurrenceObject } from "@/types"
import { Component } from "obsidian"
import { GroupSelector } from "./GroupSelector"
import { OccurrenceListItem } from "./OccurrenceListItem"
import { GroupByOption } from "./types"

export class OccurrenceList extends Component {
  private plugin: OccurrencesPlugin
  private containerEl: HTMLElement
  private occurrenceListItems: Map<string, OccurrenceListItem> = new Map()
  private groupBy: GroupByOption
  private groups: Map<string, ListGroup> = new Map()
  private groupSelector: GroupSelector
  private listContainerEl: HTMLElement

  constructor(
    plugin: OccurrencesPlugin,
    containerEl: HTMLElement,
    initialGroupBy: GroupByOption = "day"
  ) {
    super()
    this.plugin = plugin
    this.containerEl = containerEl
    this.groupBy = initialGroupBy
    this.containerEl.addClass("occurrence-list")

    // Create and add the group selector at the top
    this.groupSelector = new GroupSelector(
      this.containerEl,
      this.groupBy,
      (value: GroupByOption) => {
        this.onGroupByChange(value)
      }
    )
    this.addChild(this.groupSelector)

    // Create the list container element (will hold the actual list items)
    // This needs to be created AFTER the group selector so it appears below it
    this.listContainerEl = this.containerEl.createEl("div", {
      cls: "occurrence-list-items",
    })
  }

  /**
   * Handle changes to the groupBy option
   */
  private onGroupByChange(value: GroupByOption): void {
    // Store current items
    const currentOccurrences = Array.from(
      this.occurrenceListItems.entries()
    ).map(([, item]) => item.getOccurrence())

    // Clear everything
    this.empty()

    // Update the groupBy option
    this.groupBy = value

    // Re-add all items with new grouping
    for (const occurrence of currentOccurrences) {
      this.addItem(occurrence)
    }
  }

  /**
   * Determine showDate and showTime based on the current groupBy setting
   */
  private getShowDate(): boolean {
    return this.groupBy === "month" || this.groupBy === "year"
  }

  private getShowTime(): boolean {
    return this.groupBy === "day"
  }

  /**
   * Add an occurrence item to the list, maintaining chronological order
   * @param occurrence - The occurrence object to add
   */
  public addItem(occurrence: OccurrenceObject): OccurrenceListItem {
    const listItem = new OccurrenceListItem(
      occurrence,
      this.listContainerEl,
      this.plugin,
      this.getShowDate(),
      this.getShowTime()
    )

    // Add to our tracking map
    this.occurrenceListItems.set(occurrence.file.path, listItem)

    // Bind for cleanup purposes
    this.addChild(listItem)

    // Insert into appropriate group
    this.insertIntoGroup(listItem)

    return listItem
  }

  /**
   * Remove an occurrence item from the list
   * @param path - The file path of the occurrence to remove
   */
  public removeItem(path: string): void {
    const listItem = this.occurrenceListItems.get(path)
    if (listItem) {
      // Remove from group
      this.removeFromGroup(listItem)
      this.occurrenceListItems.delete(path)
      this.removeChild(listItem)
    }
  }

  /**
   * Remove all occurrence items from the list
   */
  public empty(): void {
    for (const [path] of this.occurrenceListItems) {
      this.removeItem(path)
    }

    // Clear groups
    this.groups.clear()
    this.listContainerEl.empty()
  }

  /**
   * Insert a list item into the appropriate group
   * @param listItem - The list item to insert
   */
  private insertIntoGroup(listItem: OccurrenceListItem): void {
    const occurrence = listItem.getOccurrence()
    const groupKey = this.getGroupKey(occurrence.properties.occurredAt)

    let group = this.groups.get(groupKey)
    if (!group) {
      // Create new group
      const groupTitle = this.getGroupTitle(occurrence.properties.occurredAt)
      group = new ListGroup(this.listContainerEl, groupTitle, this.plugin.app, {
        initialCollapsed: false,
        collapsible: true,
        showCount: true,
      })
      this.groups.set(groupKey, group)
      this.addChild(group)

      // Insert group in correct order (most recent first)
      this.insertGroupInOrder(group, groupKey)
    }

    // Insert item into group in chronological order
    this.insertItemIntoGroupInOrder(listItem, group)
  }

  /**
   * Remove a list item from its group
   * @param listItem - The list item to remove
   */
  private removeFromGroup(listItem: OccurrenceListItem): void {
    const occurrence = listItem.getOccurrence()
    const groupKey = this.getGroupKey(occurrence.properties.occurredAt)
    const group = this.groups.get(groupKey)

    if (group) {
      group.removeListItem(listItem)
      listItem.unload()

      // Remove group if empty
      if (group.getListItems().length === 0) {
        group.getRootEl().remove()
        group.unload()
        this.groups.delete(groupKey)
        this.removeChild(group)
      }
    }
  }

  /**
   * Insert a group in chronological order (most recent first)
   * @param group - The group to insert
   * @param groupKey - The key of the group
   */
  private insertGroupInOrder(group: ListGroup, groupKey: string): void {
    const groupKeys = Array.from(this.groups.keys()).sort((a, b) => {
      // Sort in reverse chronological order (most recent first)
      return b.localeCompare(a)
    })

    const insertIndex = groupKeys.indexOf(groupKey)
    if (insertIndex === 0) {
      // Insert at the beginning
      this.listContainerEl.insertBefore(
        group.getRootEl(),
        this.listContainerEl.firstChild
      )
    } else if (insertIndex === groupKeys.length - 1) {
      // Insert at the end
      this.listContainerEl.appendChild(group.getRootEl())
    } else {
      // Insert in the middle
      const nextGroupKey = groupKeys[insertIndex + 1]
      const nextGroup = this.groups.get(nextGroupKey)
      if (nextGroup) {
        this.listContainerEl.insertBefore(
          group.getRootEl(),
          nextGroup.getRootEl()
        )
      }
    }
  }

  /**
   * Insert an item into a group in chronological order (most recent first)
   * @param listItem - The list item to insert
   * @param group - The group to insert into
   */
  private insertItemIntoGroupInOrder(
    listItem: OccurrenceListItem,
    group: ListGroup
  ): void {
    const occurrence = listItem.getOccurrence()
    const occurredAt = occurrence.properties.occurredAt.getTime()
    const existingItems = group.getListItems()

    let insertIndex = existingItems.length

    for (let i = 0; i < existingItems.length; i++) {
      const existingItem = existingItems[i]
      // Cast to OccurrenceListItem to access getOccurrence method
      const occurrenceItem = existingItem as OccurrenceListItem
      const existingOccurredAt = occurrenceItem
        .getOccurrence()
        .properties.occurredAt.getTime()

      if (occurredAt > existingOccurredAt) {
        insertIndex = i
        break
      }
    }

    if (insertIndex === 0) {
      group.insertListItemAt(listItem, 0)
    } else if (insertIndex === existingItems.length) {
      group.addListItem(listItem)
    } else {
      group.insertListItemAt(listItem, insertIndex)
    }
  }

  /**
   * Get the group key for a given date
   * @param date - The date to get the group key for
   * @returns The group key string
   */
  private getGroupKey(date: Date): string {
    switch (this.groupBy) {
      case "day":
        // Use local date methods instead of toISOString() to respect user's timezone
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}` // YYYY-MM-DD
      case "month":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}` // YYY-MM
      case "year":
        return date.getFullYear().toString() // YYYY
      default:
        return ""
    }
  }

  /**
   * Get the display title for a group
   * @param date - The date to get the group title for
   * @returns The group title string
   */
  private getGroupTitle(date: Date): string {
    switch (this.groupBy) {
      case "day":
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ]
        return `${dayNames[date.getDay()]}, ${
          monthNames[date.getMonth()]
        } ${date.getDate()} ${date.getFullYear()}`
      case "month":
        const fullMonthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]
        return `${fullMonthNames[date.getMonth()]} ${date.getFullYear()}`
      case "year":
        return date.getFullYear().toString()
      default:
        return ""
    }
  }
}
