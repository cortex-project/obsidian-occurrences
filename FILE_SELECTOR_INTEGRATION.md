# FileSelector Integration Guide

## Overview
The FileSelector component has been successfully created and integrated into the occurrences view header. Here's what has been implemented:

## Files Created/Modified

### New Components
- `src/components/fileSelector.ts` - Main FileSelector component
- `src/components/searchBar.ts` - Extracted SearchBar component
- `src/occurrencesView/header.ts` - Updated header with FileSelector integration

### Updated Files
- `src/components/index.ts` - Added exports for new components
- `src/components/styles.css` - Added FileSelector CSS styles

## FileSelector Features

### Input Element Design
- ✅ Uses `link` icon instead of search icon
- ✅ Placeholder text: "Linking to..."
- ✅ Clear button (x) to clear file name value
- ✅ Target icon button next to input
  - When clicked active: sets input to "Current Active File"
  - When clicked inactive: replaces with actual current file name

### Suggestions Container
- ✅ First option shows current active file when input is empty
- ✅ Shows matching files when user types
- ✅ Each file displays: file name + muted full file path below
- ✅ Up to 10 suggestions shown
- ✅ Smart sorting (basename matches first, then path matches)

### Integration into Header
- ✅ Replaces existing `crosshair` button with `link` icon button
- ✅ Toggle show/hide when clicking the button
- ✅ Updates SearchFilters interface with new `selectedFile` and `fileSelector` properties
- ✅ Listens to `app.workspace.on("active-leaf-change")` for current file updates
- ✅ Triggers `onActiveFileChange()` callback when "Current Active File" is selected

## Usage

### In Your Occurrences View
To integrate the header with FileSelector:

```typescript
import { Header } from "@/occurrencesView/header"

// In your view component
const header = new Header(
  containerElement,
  this.app,
  (filters) => {
    // Handle filter changes
    console.log('Selected file:', filters.selectedFile)
    // Update your occurrences display based on the selected file
  },
  () => {
    // Handle active file change (when in current file mode)
    // This replaces your existing handleActiveFileChange logic
  }
)
```

### Filter Types
The `SearchFilters` interface now includes:
```typescript
interface SearchFilters {
  search: boolean
  searchQuery: string
  fileSelector: boolean
  selectedFile: FileSelectorResult  // New property
  inbox: boolean
}
```

Where `FileSelectorResult` is:
```typescript
interface FileSelectorResult {
  type: "current" | "file"
  file: TFile | null
}
```

## CSS Classes
The component uses these CSS classes (already styled):
- `.file-selector-container`
- `.file-selector-input-container`
- `.file-selector-icon`
- `.file-selector-input`
- `.file-selector-clear-button`
- `.file-selector-target-button`
- `.file-selector-suggestions`
- `.file-selector-suggestion-item`
- `.file-selector-suggestion-name`
- `.file-selector-suggestion-path`

## Next Steps
1. Update your main occurrences view to use the new Header component
2. Implement the filter logic to handle the selected file in your occurrence display
3. Test the component in your Obsidian environment

The implementation follows Obsidian's design patterns and integrates seamlessly with the existing UI system.