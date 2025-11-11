export interface SearchFilters {
  search: boolean
  searchQuery: string
  currentFile: boolean
  selectedFile: string | null
  inbox: boolean
  tags: boolean
  selectedTags: string[]
  dateFilter: boolean
  dateFrom: Date | null
  dateTo: Date | null
  sortOrder: "asc" | "desc"
}

export interface SearchMetadata {
  participants: string[]
  locations: string[]
}

export interface SearchOptions {
  query?: string
  linksTo?: string
  toProcess?: boolean
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  sortOrder?: "asc" | "desc"
}

export interface SearchResult {
  items: any[]
  pagination: {
    total: number
    offset: number
    limit: number
  }
  metadata: SearchMetadata
}

export interface FilterChangeCallback {
  (filters: SearchFilters): void
}

export interface SummaryUpdateCallback {
  (
    totalCount: number,
    metadata: SearchMetadata,
    pagination?: { offset: number; limit: number }
  ): void
}
