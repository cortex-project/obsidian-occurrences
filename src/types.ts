// TODO: Refactor for just Occurrences

import { TFile } from "obsidian"

// Common types used across multiple entity types
export interface ObsidianLink {
  type: "wiki" | "markdown" | "uri"
  target: string // The referenced file/page
  displayText?: string // Optional display text
  alias?: string // The alias part in wikilinks (after the pipe)
  section?: string // For links to a specific section like [[Page#Section]]
  vault?: string // For URI links
}

export interface OccurrenceProperties {
  types?: string[]
  tags?: string[]
  occurredAt: Date
  toProcess: boolean
  participants: ObsidianLink[]
  intents: ObsidianLink[]
  location: ObsidianLink | null
}

export interface OccurrenceObject {
  path: string
  file: TFile
  title: string
  class: "Occurrence"
  properties: OccurrenceProperties
}

// ======== SHARED CONSTANTS ========
// TODO: Make this a configurable option
export const OCCURRENCE_DATE_FORMAT = "YYYY-MM-DD HHmm" as const

// ======== TYPE GUARDS ========

export function isOccurrenceObject(obj: any): obj is OccurrenceObject {
  return (
    obj &&
    obj.class === "Occurrence" &&
    obj.properties &&
    obj.properties.occurredAt
  )
}
