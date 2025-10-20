import { App, Component, setIcon } from "obsidian"
import { SearchMetadata } from "../types"

export class Summary extends Component {
  private summaryEl: HTMLElement
  private app: App
  private detailsExpanded: boolean = false

  constructor(container: HTMLElement, app: App) {
    super()
    this.app = app
    this.summaryEl = container.createEl("div", {
      cls: "occurrences-summary",
    })
    this.summaryEl.hide() // Initially hidden
  }

  /**
   * Create a clickable link element with hover preview and click handling
   */
  private createClickableLink(
    container: HTMLElement,
    target: string,
    index: number,
    maxItems: number
  ): HTMLElement {
    const linkEl = container.createEl("a", {
      cls: "internal-link",
      text: target,
      attr: {
        "data-href": target,
        "aria-label": `Open ${target}`,
        "data-item-index": index.toString(),
      },
    })

    // Add click handler
    this.registerDomEvent(linkEl, "click", event => {
      event.preventDefault()
      this.app.workspace.openLinkText(target, "", false)
    })

    // Add hover preview
    this.registerDomEvent(linkEl, "mouseover", event => {
      this.app.workspace.trigger("hover-link", {
        event: event,
        source: "file-explorer",
        hoverParent: linkEl,
        targetEl: linkEl,
        linktext: target,
      })
    })

    return linkEl
  }

  /**
   * Create a display element for a list of items with clickable links
   */
  private createItemDisplay(
    container: HTMLElement,
    items: string[],
    label: string
  ): void {
    if (items.length === 0) return

    const row = container.createEl("div", {
      cls: "details-row",
    })

    const labelEl = row.createEl("span", {
      cls: "details-label",
    })

    // Add icon based on label type
    if (label === "Participants") {
      const iconEl = labelEl.createEl("span", {
        cls: "details-label-icon",
      })
      setIcon(iconEl, "users")
      labelEl.createEl("span", {
        text: ` ${label} (${items.length}):`,
      })
    } else if (label === "Locations") {
      const iconEl = labelEl.createEl("span", {
        cls: "details-label-icon",
      })
      setIcon(iconEl, "map-pin")
      labelEl.createEl("span", {
        text: ` ${label} (${items.length}):`,
      })
    } else {
      // Fallback for other labels
      labelEl.createEl("span", {
        text: `${label} (${items.length}):`,
      })
    }

    const valueContainer = row.createEl("div", {
      cls: "details-value",
    })

    // Set the default number of visible items
    const maxItems = 8
    const hiddenCount = items.length - maxItems

    // Create visible items as clickable links
    const visibleItems = items.slice(0, maxItems)
    visibleItems.forEach((target, index) => {
      this.createClickableLink(valueContainer, target, index, maxItems)

      // Add comma separator (except for last visible item)
      if (index < visibleItems.length - 1) {
        valueContainer.createEl("span", { text: ", " })
      }
    })

    // Show "more..." if there are additional items
    if (hiddenCount > 0) {
      const moreButton = valueContainer.createEl("span", {
        cls: "details-more-button",
        text: " more...",
      })

      // Create hidden section with all remaining items
      const hiddenSection = valueContainer.createEl("span", {
        cls: "details-hidden-section",
      })
      hiddenSection.style.display = "none"

      // Add comma before hidden section if there are visible items
      if (visibleItems.length > 0) {
        hiddenSection.createEl("span", { text: ", " })
      }

      // Add all hidden items to the hidden section
      items.slice(maxItems).forEach((target, index) => {
        this.createClickableLink(
          hiddenSection,
          target,
          maxItems + index,
          maxItems
        )

        // Add comma separator (except for last hidden item)
        if (index < items.slice(maxItems).length - 1) {
          hiddenSection.createEl("span", { text: ", " })
        }
      })

      // Add "less" button at the end of the hidden section
      const lessButton = hiddenSection.createEl("span", {
        cls: "details-more-button",
        text: " less",
      })

      // Simple toggle functionality
      this.registerDomEvent(moreButton, "click", () => {
        hiddenSection.style.display = "inline"
        moreButton.style.display = "none"
      })

      // Also handle clicks on the "less" button
      this.registerDomEvent(lessButton, "click", () => {
        hiddenSection.style.display = "none"
        moreButton.style.display = "inline"
      })
    }
  }

  /**
   * Update the summary display with new data
   */
  public updateSummary(
    totalCount: number,
    metadata: SearchMetadata,
    pagination?: { offset: number; limit: number }
  ): void {
    this.summaryEl.empty()

    if (totalCount === 0) {
      this.summaryEl.hide()
      return
    }

    this.summaryEl.show()

    // Create main summary line
    const summaryLine = this.summaryEl.createEl("div", {
      cls: "summary-line",
    })

    // Create count container
    const countContainer = summaryLine.createEl("div", {
      cls: "summary-count-container",
    })

    // Main count text
    const countText = `${totalCount} Occurrence${
      totalCount === 1 ? "" : "s"
    } found`

    countContainer.createEl("span", {
      cls: "summary-count",
      text: countText,
    })

    // Add pagination info if showing subset
    if (pagination && pagination.offset > 0) {
      const showingCount = Math.min(
        pagination.limit,
        totalCount - pagination.offset
      )
      countContainer.createEl("span", {
        cls: "summary-pagination",
        text: `showing ${showingCount} results`,
      })
    } else if (pagination && pagination.limit < totalCount) {
      countContainer.createEl("span", {
        cls: "summary-pagination",
        text: `showing ${pagination.limit} results`,
      })
    }

    // Add details expander on the right
    const detailsElement = summaryLine.createEl("span", {
      cls: "summary-details-text",
    })

    const detailsText = detailsElement.createEl("span", {
      cls: "details-text",
      text: "details",
    })

    const caret = detailsElement.createEl("span", {
      cls: "details-caret",
    })
    setIcon(caret, "chevron-down")

    // Create expandable details section
    const detailsSection = this.summaryEl.createEl("div", {
      cls: "summary-details",
    })

    // Set initial state based on stored expansion state
    if (this.detailsExpanded) {
      detailsSection.show()
      setIcon(caret, "chevron-up")
    } else {
      detailsSection.hide()
      setIcon(caret, "chevron-down")
    }

    // Participants row with item display
    this.createItemDisplay(
      detailsSection,
      metadata.participants,
      "Participants"
    )

    // Locations row with item display
    this.createItemDisplay(detailsSection, metadata.locations, "Locations")

    // Handle details toggle
    this.registerDomEvent(detailsElement, "click", () => {
      if (detailsSection.isShown()) {
        detailsSection.hide()
        setIcon(caret, "chevron-down")
        this.detailsExpanded = false
      } else {
        detailsSection.show()
        setIcon(caret, "chevron-up")
        this.detailsExpanded = true
      }
    })
  }

  /**
   * Get the summary element
   */
  public getElement(): HTMLElement {
    return this.summaryEl
  }
}
