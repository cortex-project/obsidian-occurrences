import { Component, setIcon, setTooltip } from "obsidian"

export class Header extends Component {
  private headerEl: HTMLElement
  private currentFileButton: HTMLElement
  private searchButton: HTMLElement
  private inboxButton: HTMLElement
  private onTabChange: (tab: "current-file" | "search" | "inbox") => void

  constructor(
    container: HTMLElement,
    onTabChange: (tab: "current-file" | "search" | "inbox") => void
  ) {
    super()
    this.headerEl = container.createEl("div", {
      cls: "occurrences-view-header",
    })
    this.onTabChange = onTabChange
    this.render()
  }

  private render(): void {
    const buttonsContainer = this.headerEl.createEl("div", {
      cls: "nav-buttons-container",
    })

    // Search button
    this.searchButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "search" },
    })
    setIcon(this.searchButton, "search")
    setTooltip(this.searchButton, "Search")

    this.searchButton.addEventListener("click", () => {
      this.onTabChange("search")
    })

    // Current file button
    this.currentFileButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "current-file" },
    })
    setIcon(this.currentFileButton, "crosshair")
    setTooltip(this.currentFileButton, "Current file")

    this.currentFileButton.addEventListener("click", () => {
      this.onTabChange("current-file")
    })

    // Inbox button
    this.inboxButton = buttonsContainer.createEl("div", {
      cls: "clickable-icon nav-action-button",
      attr: { id: "inbox" },
    })
    setIcon(this.inboxButton, "inbox")
    setTooltip(this.inboxButton, "Inbox")

    this.inboxButton.addEventListener("click", () => {
      this.onTabChange("inbox")
    })
  }

  public setActiveTab(tab: "current-file" | "search" | "inbox"): void {
    const buttons = [
      this.currentFileButton,
      this.searchButton,
      this.inboxButton,
    ]
    buttons.forEach(button => button.removeClass("is-active"))
    buttons.find(button => button.id === tab)?.addClass("is-active")
  }

  public getElement(): HTMLElement {
    return this.headerEl
  }
}
