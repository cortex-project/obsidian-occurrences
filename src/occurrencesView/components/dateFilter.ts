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
  private periodSelector: HTMLSelectElement
  private periodWrapper: HTMLElement
  private isRangeMode: boolean = false
  private isPeriodMode: boolean = false
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
    const duringOption = this.rangeToggle.createEl("option", {
      text: "during",
      attr: { value: "during" },
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

    // Create wrapper for period selector (initially hidden)
    this.periodWrapper = inputWrapper.createEl("div", {
      cls: "date-period-section",
    })
    this.periodWrapper.style.display = "none"

    // Create period selector
    this.periodSelector = this.periodWrapper.createEl("select", {
      cls: "date-period-select",
      attr: {
        "aria-label": "Select time period",
      },
    }) as HTMLSelectElement

    // Add period options
    const periods = [
      { value: "today", text: "today" },
      { value: "yesterday", text: "yesterday" },
      { value: "this-week", text: "this week" },
      { value: "last-week", text: "last week" },
      { value: "this-month", text: "this month" },
      { value: "last-month", text: "last month" },
      { value: "this-year", text: "this year" },
      { value: "last-year", text: "last year" },
    ]

    periods.forEach(period => {
      this.periodSelector.createEl("option", {
        text: period.text,
        attr: { value: period.value },
      })
    })

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

    this.registerDomEvent(this.periodSelector, "change", () => {
      this.handlePeriodChange()
    })
  }

  /**
   * Toggle between single date, range mode, and period mode
   */
  private toggleRangeMode(): void {
    const mode = this.rangeToggle.value
    this.isRangeMode = mode === "between"
    this.isPeriodMode = mode === "during"

    // Reset all elements to their default state
    this.fromInput.style.display = "block"
    this.toInputWrapper.style.display = "none"
    this.periodWrapper.style.display = "none"

    if (this.isRangeMode) {
      // Show both date inputs for range mode
      this.toInputWrapper.style.display = "flex"
      this.fromInput.setAttribute("aria-label", "Start date")
    } else if (this.isPeriodMode) {
      // Hide date input and show period selector
      this.fromInput.style.display = "none"
      this.periodWrapper.style.display = "flex"
      this.handlePeriodChange()
    } else {
      // Single date mode - clear other inputs
      this.fromInput.setAttribute("aria-label", "Date")
      this.toInput.value = ""
      this.periodSelector.value = ""
      this.handleDateChange()
    }
  }

  /**
   * Handle period selector changes
   */
  private handlePeriodChange(): void {
    const period = this.periodSelector.value
    if (!period) {
      this.clearButton.style.display = "none"
      this.onDateChange(null, null)
      return
    }

    const { from, to } = this.calculatePeriodDates(period)

    // Update clear button visibility
    this.clearButton.style.display = "flex"

    // Trigger callback
    this.onDateChange(from, to)
  }

  /**
   * Calculate date range for a given period
   */
  private calculatePeriodDates(period: string): { from: Date; to: Date } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (period) {
      case "today":
        return {
          from: new Date(today),
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }

      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return {
          from: yesterday,
          to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
        }

      case "this-week":
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 7)
        return {
          from: startOfWeek,
          to: new Date(endOfWeek.getTime() - 1),
        }

      case "last-week":
        const lastWeekStart = new Date(today)
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
        const lastWeekEnd = new Date(lastWeekStart)
        lastWeekEnd.setDate(lastWeekStart.getDate() + 7)
        return {
          from: lastWeekStart,
          to: new Date(lastWeekEnd.getTime() - 1),
        }

      case "this-month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        )
        return {
          from: startOfMonth,
          to: new Date(endOfMonth.getTime() - 1),
        }

      case "last-month":
        const lastMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        )
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1)
        return {
          from: lastMonthStart,
          to: new Date(lastMonthEnd.getTime() - 1),
        }

      case "this-year":
        const startOfYear = new Date(today.getFullYear(), 0, 1)
        const endOfYear = new Date(today.getFullYear() + 1, 0, 1)
        return {
          from: startOfYear,
          to: new Date(endOfYear.getTime() - 1),
        }

      case "last-year":
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
        const lastYearEnd = new Date(today.getFullYear(), 0, 1)
        return {
          from: lastYearStart,
          to: new Date(lastYearEnd.getTime() - 1),
        }

      default:
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
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
    this.periodSelector.value = ""
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
    if (this.isRangeMode || this.isPeriodMode) {
      this.rangeToggle.value = "on"
      this.toggleRangeMode()
    }
  }

  /**
   * Get the current date values
   */
  public getValues(): { from: Date | null; to: Date | null } {
    if (this.isPeriodMode) {
      const period = this.periodSelector.value
      if (!period) {
        return { from: null, to: null }
      }
      return this.calculatePeriodDates(period)
    }

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
    // Clear period selector first
    this.periodSelector.value = ""

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

