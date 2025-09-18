import { App } from "obsidian"

/**
 * Get all existing tags from the vault
 * @param {App} app - The Obsidian app instance
 * @returns {string[]} - The list of all tags in the vault
 */
export function getAllVaultTags(app: App): string[] {
  const allTags = new Set<string>()

  // Get all files in the vault
  const allFiles = app.vault.getMarkdownFiles()

  // Extract tags from each file's cache
  for (const file of allFiles) {
    const fileCache = app.metadataCache.getFileCache(file)
    if (fileCache?.frontmatter?.tags) {
      const fileTags = Array.isArray(fileCache.frontmatter.tags)
        ? fileCache.frontmatter.tags
        : [fileCache.frontmatter.tags]

      fileTags.forEach(tag => {
        // Remove # prefix if present and add to set
        const cleanTag =
          typeof tag === "string" ? tag.replace(/^#/, "") : String(tag)
        allTags.add(cleanTag)
      })
    }

    // Also check for tags in the content (hashtags)
    if (fileCache?.tags) {
      fileCache.tags.forEach(tagCache => {
        const cleanTag = tagCache.tag.replace(/^#/, "")
        allTags.add(cleanTag)
      })
    }
  }

  return Array.from(allTags).sort()
}

/**
 * Normalize tags to an array of strings
 * @param {unknown} tags - The tags to normalize
 * @returns {string[]} - The normalized tags
 */
export function normalizeTags(tags: unknown): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === "string") return [tags]
  return []
}
