import { OccurrenceObject } from "@/types"
import { App } from "obsidian"

export interface SearchOptions {
  query?: string
  tags?: string[]
  linksTo?: string // File path to filter occurrences that link to this target
  toProcess?: boolean // Filter occurrences that are marked as toProcess
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface SearchResult {
  items: OccurrenceObject[]
  total: number
  hasMore: boolean
}

export class OccurrenceSearch {
  private tagIndex: Map<string, Set<string>> = new Map()

  constructor(private app: App, private items: Map<string, OccurrenceObject>) {}

  /**
   * Update all indexes when an occurrence is added/updated/removed
   */
  public updateIndexes(
    occurrence: OccurrenceObject,
    action: "add" | "remove"
  ): void {
    this.updateTagIndex(occurrence, action)
  }

  /**
   * Search for occurrences that link to a specific target file path
   * @param targetPath - The file path to find inbound links for
   * @returns Set of occurrence file paths that link to the target
   */
  private searchByReverseLinks(targetPath: string): Set<string> {
    const results = new Set<string>()
    const resolvedLinks = this.app.metadataCache.resolvedLinks

    // Check each occurrence file for links to the target
    for (const [occurrencePath] of this.items) {
      const links = resolvedLinks[occurrencePath]
      if (links && links[targetPath]) {
        results.add(occurrencePath)
      }
    }

    return results
  }

  /**
   * Perform a search with the given options
   */
  public search(options: SearchOptions = {}): SearchResult {
    let candidatePaths: Set<string> = new Set(this.items.keys())

    // Apply linksTo filter (occurrences that link to a specific target)
    if (options.linksTo) {
      const linkingPaths = this.searchByReverseLinks(options.linksTo)
      candidatePaths = new Set(
        [...candidatePaths].filter(path => linkingPaths.has(path))
      )
    }

    // Apply tag filter
    if (options.tags && options.tags.length > 0) {
      const tagPaths = this.searchByTags(options.tags)
      candidatePaths = new Set(
        [...candidatePaths].filter(path => tagPaths.has(path))
      )
    }

    // Apply title search (direct string matching with fuzzy logic)
    if (options.query) {
      const titlePaths = this.searchByTitle(options.query)
      candidatePaths = new Set(
        [...candidatePaths].filter(path => titlePaths.has(path))
      )
    }

    // Convert paths back to objects
    const results = Array.from(candidatePaths)
      .map(path => this.items.get(path))
      .filter((item): item is OccurrenceObject => item !== undefined)

    // Apply toProcess filter
    const finalResults =
      options.toProcess !== undefined
        ? results.filter(
            item => item.properties.toProcess === options.toProcess
          )
        : results

    // Sort results
    const sortOrder = options.sortOrder || "desc"
    finalResults.sort((a, b) => {
      const comparison =
        a.properties.occurredAt.getTime() - b.properties.occurredAt.getTime()
      return sortOrder === "desc" ? -comparison : comparison
    })

    // Apply pagination
    const total = finalResults.length
    const offset = options.offset || 0
    const limit = options.limit || 100
    const paginatedResults = finalResults.slice(offset, offset + limit)

    return {
      items: paginatedResults,
      total,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Clear all indexes
   */
  public clear(): void {
    this.tagIndex.clear()
  }

  // Private helper methods
  private updateTagIndex(
    occurrence: OccurrenceObject,
    action: "add" | "remove"
  ): void {
    occurrence.properties.tags?.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      const tagSet = this.tagIndex.get(tag)!

      if (action === "add") {
        tagSet.add(occurrence.path)
      } else {
        tagSet.delete(occurrence.path)
      }
    })
  }

  /**
   * Search by title using direct string matching with fuzzy logic
   */
  private searchByTitle(query: string): Set<string> {
    const results = new Set<string>()
    const queryLower = query.toLowerCase()

    // Direct string matching with fuzzy logic - very fast for 10k+ items
    for (const [path, occurrence] of this.items) {
      if (this.matchesTitle(occurrence.title, queryLower)) {
        results.add(path)
      }
    }

    return results
  }

  /**
   * Check if a title matches the query using fuzzy matching
   */
  private matchesTitle(title: string, query: string): boolean {
    const titleLower = title.toLowerCase()

    // Exact substring match (fastest and most common case)
    if (titleLower.includes(query)) {
      return true
    }

    // Simple fuzzy matching for partial words
    const words = titleLower.split(/\s+/)
    return words.some(
      word =>
        word.startsWith(query) || this.levenshteinDistance(word, query) <= 2
    )
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy matching with a maximum distance of 2
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length

    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null))

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        )
      }
    }

    return matrix[b.length][a.length]
  }

  private searchByTags(tags: string[]): Set<string> {
    if (tags.length === 0) return new Set(this.items.keys())

    const resultPaths = new Set<string>()

    // Union all tag sets (OR logic) - return occurrences that have ANY of the specified tags
    for (const tag of tags) {
      const tagPaths = this.tagIndex.get(tag) || new Set()
      for (const path of tagPaths) {
        resultPaths.add(path)
      }
    }

    return resultPaths
  }
}
