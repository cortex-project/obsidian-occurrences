import { Component, setIcon, setTooltip } from "obsidian"
import { GroupByOption } from "./types"

/**
 * A segmented control component for selecting grouping options
 */
export class GroupSelector extends Component {
  private containerEl: HTMLElement
  private onChange?: (value: GroupByOption) => void
  private currentValue: GroupByOption
  private buttons: Map<GroupByOption, HTMLElement> = new Map()
  private buttonGroupEl: HTMLElement

  constructor(
    containerEl: HTMLElement,
    initialValue: GroupByOption = "day",
    onChange?: (value: GroupByOption) => void
  ) {
    super()
    this.containerEl = containerEl
    this.onChange = onChange
    this.currentValue = initialValue

    // Create the button group container
    this.buttonGroupEl = this.containerEl.createEl("div", {
      cls: "group-selector-container",
    })

    // Create the three buttons
    this.createButton("day", "calendar-x", "Group by Day")
    this.createButton("month", "calendar-days", "Group by Month")
    this.createButton("year", "calendar", "Group by Year")

    // Set initial active state
    this.updateActiveButton()
  }

  /**
   * Create a button for a grouping option
   */
  private createButton(
    value: GroupByOption,
    icon: string,
    tooltip: string
  ): void {
    const button = this.buttonGroupEl.createEl("div", {
      cls: "group-selector-button clickable-icon",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": tooltip,
        "aria-pressed": (value === this.currentValue).toString(),
        "data-group-by": value,
      },
    })

    setIcon(button, icon)
    setTooltip(button, tooltip)

    this.registerDomEvent(button, "click", () => {
      this.setValue(value)
    })

    // Add keyboard support
    this.registerDomEvent(button, "keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        this.setValue(value)
      }
    })

    this.buttons.set(value, button)
  }

  /**
   * Set the current value and update the UI
   */
  public setValue(value: GroupByOption): void {
    if (this.currentValue === value) return

    this.currentValue = value
    this.updateActiveButton()

    this.onChange?.(value)
  }

  /**
   * Get the current value
   */
  public getValue(): GroupByOption {
    return this.currentValue
  }

  /**
   * Update which button appears active
   */
  private updateActiveButton(): void {
    this.buttons.forEach((button, value) => {
      if (value === this.currentValue) {
        button.addClass("is-active")
        button.setAttribute("aria-pressed", "true")
      } else {
        button.removeClass("is-active")
        button.setAttribute("aria-pressed", "false")
      }
    })
  }

  /**
   * Get the container element
   */
  public getContainerEl(): HTMLElement {
    return this.buttonGroupEl
  }
}

