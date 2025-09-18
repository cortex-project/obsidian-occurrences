import { Plugin } from "obsidian"

export default class OccurrencesPlugin extends Plugin {
  // occurrenceStore: OccurrenceStore
  // settings: SettingsStore

  async onload() {
    // this.settings = new SettingsStore(this)
    // await this.settings.loadSettings()
    // this.addSettingTab(new CortexSettingsTab(this.app, this))

    // this.occurrenceStore = new OccurrenceStore(this.app)
    // this.app.workspace.onLayoutReady(() => {
    //   this.occurrenceStore.load()
    // })

    // Add ribbon icon
    this.addRibbonIcon(
      "calendar-clock",
      "Open Occurrences View",
      (evt: MouseEvent) => {
        // TODO: Open Occurrences View
        console.log("Open Occurrences View")
      }
    )

    // Register views
    // this.registerView(OCCURRENCES_VIEW, leaf => new OccurrencesView(leaf, this))

    // Open Occurrences Explorer
    this.addCommand({
      id: "open-occurrences-view",
      name: "Open Occurrences View",
      callback: () => {
        // TODO: Open Occurrences View
        console.log("Open Occurrences View")
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

    // Register protocol handler for add-intent
    // TODO: Update mobile app to use add-occurrence
    this.registerObsidianProtocolHandler("add-occurrence", params => {
      // Open the intent modal
      // new OccurrenceModal(this, params as Partial<OccurrenceObject>, file => {
      //   this.app.workspace.openLinkText(file.path, "", false)
      // }).open()
    })
  }

  onunload() {}
}
