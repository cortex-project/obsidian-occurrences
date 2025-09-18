import { Plugin, WorkspaceLeaf } from "obsidian"
import { OccurrenceStore } from "./occurrenceStore"
import { OCCURRENCES_VIEW, OccurrencesView } from "./occurrencesView"

export default class OccurrencesPlugin extends Plugin {
  occurrenceStore: OccurrenceStore
  // settings: SettingsStore

  async onload() {
    // this.settings = new SettingsStore(this)
    // await this.settings.loadSettings()
    // this.addSettingTab(new CortexSettingsTab(this.app, this))

    this.occurrenceStore = new OccurrenceStore(this.app)

    this.app.workspace.onLayoutReady(() => {
      this.occurrenceStore.load()
    })

    this.addRibbonIcon(
      "calendar-range",
      "Open Occurrences View",
      (evt: MouseEvent) => {
        this.openView()
      }
    )
    // Register View
    this.registerView(OCCURRENCES_VIEW, leaf => new OccurrencesView(leaf, this))

    // Add Commands
    this.addCommand({
      id: "open-occurrences-view",
      name: "Open Occurrences View",
      callback: () => {
        this.openView()
      },
    })

    // Create Occurrence
    this.addCommand({
      id: "add-occurrence",
      name: "Add Occurrence",
      callback: () => {
        try {
          // TODO: Convert ObjectModal to be used here
          // new ObjectModal({
          //   plugin: this,
          //   objectClass: "Entity",
          //   onSubmit: (file: any) => {
          //     // Once created open the entity in the active editor
          //     this.app.workspace.openLinkText(file.path, "", false)
          //   },
          // }).open()
        } catch (error) {
          console.error("Failed to create Occurrence:", error)
        }
      },
    })

    // TODO: Update mobile app to use add-occurrence
    this.registerObsidianProtocolHandler("add-occurrence", params => {
      // new OccurrenceModal(this, params as Partial<OccurrenceObject>, file => {
      //   this.app.workspace.openLinkText(file.path, "", false)
      // }).open()
    })
  }

  private async openView(): Promise<void> {
    const { workspace } = this.app

    let leaf: WorkspaceLeaf | null = null
    const leaves = workspace.getLeavesOfType(OCCURRENCES_VIEW)

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0]
    } else {
      // Try to get an existing leaf or create a new one
      leaf = workspace.getRightLeaf(false)
      if (leaf) {
        await leaf.setViewState({ type: OCCURRENCES_VIEW, active: true })
      }
    }

    if (leaf !== null) {
      // Ensure the sidebar is expanded
      workspace.rightSplit.expand()

      // Reveal the leaf
      workspace.revealLeaf(leaf)

      // Brief timeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  onunload() {}
}
