import { Component, setIcon } from "obsidian"

export interface DateFilterOptions {
  placeholder?: string
}

export class DateFilter extends Component {
  private dateContainer: HTMLElement
  private dateInputContainer: HTMLElement
  private fromInput: HTMLInputElement
  private toInput: HTMLInputElement
  private rangeToggle: HTMLSelectElement
  private clearButton: HTMLElement
  private andText: HTMLElement
  private toInputWrapper: HTMLElement
  private isRangeMode: boolean = false
  private onDateChange: (dateFrom: Date | null, dateTo: Date | null) => void
  private options: DateFilterOptions

  constructor(
    container: HTMLElement,
    onDateChange: (dateFrom: Date | null, dateTo: Date | null) => void,
    options: DateFilterOptions = {}
  ) {
    super()
    this.options = {
      placeholder: "Select date...",
      ...options,
    }
    this.onDateChange = onDateChange
    this.render(container)
  }

  private render(container: HTMLElement): void {
    // Create date filter container
    this.dateContainer = container.createEl("div", {
      cls: "date-filter-container",
    })
    this.dateContainer.style.display = "none"

    // Create date input container
    this.dateInputContainer = this.dateContainer.createEl("div", {
      cls: "date-filter-input-container",
    })

    // Create calendar icon
    const calendarIcon = this.dateInputContainer.createEl("div", {
      cls: "date-filter-icon",
    })
    setIcon(calendarIcon, "calendar")

    // Create input wrapper for positioning (contains select, inputs, and clear button)
    const inputWrapper = this.dateInputContainer.createEl("div", {
      cls: "date-input-wrapper",
    })

    // Create range mode toggle (on/between selector)
    this.rangeToggle = inputWrapper.createEl("select", {
      cls: "date-mode-toggle",
      attr: {
        "aria-label": "Toggle between single date and date range",
      },
    }) as HTMLSelectElement

    // Add options to the select
    const onOption = this.rangeToggle.createEl("option", {
      text: "on",
      attr: { value: "on" },
    })
    const betweenOption = this.rangeToggle.createEl("option", {
      text: "between",
      attr: { value: "between" },
    })

    // Create "from" date input
    this.fromInput = inputWrapper.createEl("input", {
      type: "date",
      attr: {
        id: "date-from-input",
        "aria-label": "Date",
      },
    }) as HTMLInputElement

    // Create wrapper for "and" text and "to" date input (initially hidden)
    this.toInputWrapper = inputWrapper.createEl("div", {
      cls: "date-to-section",
    })
    this.toInputWrapper.style.display = "none"

    // Create "and" text
    this.andText = this.toInputWrapper.createEl("span", {
      text: "and",
      cls: "date-and-text",
    })

    // Create "to" date input
    this.toInput = this.toInputWrapper.createEl("input", {
      type: "date",
      attr: {
        id: "date-to-input",
        "aria-label": "End date",
      },
    }) as HTMLInputElement

    // Create clear button
    this.clearButton = inputWrapper.createEl("div", {
      cls: "search-input-clear-button",
      attr: {
        "aria-label": "Clear dates",
      },
    })
    this.clearButton.style.display = "none"

    // Add event listeners
    this.registerDomEvent(this.fromInput, "change", () => {
      this.handleDateChange()
    })

    this.registerDomEvent(this.toInput, "change", () => {
      this.handleDateChange()
    })

    this.registerDomEvent(this.rangeToggle, "change", () => {
      this.toggleRangeMode()
    })

    this.registerDomEvent(this.clearButton, "click", () => {
      this.clearDates()
    })
  }

  /**
   * Toggle between single date and range mode
   */
  private toggleRangeMode(): void {
    this.isRangeMode = this.rangeToggle.value === "between"

    if (this.isRangeMode) {
      this.toInputWrapper.style.display = "flex"
      this.fromInput.setAttribute("aria-label", "Start date")
    } else {
      this.toInputWrapper.style.display = "none"
      this.toInput.value = ""
      this.fromInput.setAttribute("aria-label", "Date")
      this.handleDateChange()
    }
  }

  /**
   * Handle date input changes
   */
  private handleDateChange(): void {
    const fromDate = this.fromInput.value
      ? new Date(this.fromInput.value + "T00:00:00")
      : null
    const toDate =
      this.isRangeMode && this.toInput.value
        ? new Date(this.toInput.value + "T00:00:00")
        : null

    // Update clear button visibility
    this.clearButton.style.display = fromDate || toDate ? "flex" : "none"

    // Trigger callback
    this.onDateChange(fromDate, toDate)
  }

  /**
   * Clear all date selections
   */
  private clearDates(): void {
    this.fromInput.value = ""
    this.toInput.value = ""
    this.clearButton.style.display = "none"
    this.onDateChange(null, null)
  }

  /**
   * Show the date filter
   */
  public show(): void {
    this.dateContainer.style.display = "block"
  }

  /**
   * Hide the date filter
   */
  public hide(): void {
    this.dateContainer.style.display = "none"
  }

  /**
   * Clear the date inputs programmatically
   */
  public clearInput(): void {
    this.clearDates()
    if (this.isRangeMode) {
      this.rangeToggle.value = "on"
      this.toggleRangeMode()
    }
  }

  /**
   * Get the current date values
   */
  public getValues(): { from: Date | null; to: Date | null } {
    const fromDate = this.fromInput.value
      ? new Date(this.fromInput.value + "T00:00:00")
      : null
    const toDate =
      this.isRangeMode && this.toInput.value
        ? new Date(this.toInput.value + "T00:00:00")
        : null
    return { from: fromDate, to: toDate }
  }

  /**
   * Set the date values programmatically
   */
  public setValues(from: Date | null, to: Date | null): void {
    if (from) {
      this.fromInput.value = this.formatDateForInput(from)
    } else {
      this.fromInput.value = ""
    }

    if (to) {
      if (!this.isRangeMode) {
        this.rangeToggle.value = "between"
        this.toggleRangeMode()
      }
      this.toInput.value = this.formatDateForInput(to)
    } else {
      this.toInput.value = ""
    }

    this.handleDateChange()
  }

  /**
   * Format a Date object for input[type="date"] (YYYY-MM-DD)
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  /**
   * Check if the date filter is visible
   */
  public isVisible(): boolean {
    return this.dateContainer.style.display === "block"
  }

  public getElement(): HTMLElement {
    return this.dateContainer
  }
}
