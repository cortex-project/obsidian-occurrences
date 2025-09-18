import { CortexObject } from "@/types"
import { TFile } from "obsidian"
import { toISOStringWithTimezone } from "./dateUtils"

/**
 * Configuration for mapping interface properties to frontmatter field names
 * This eliminates the need for hardcoded exclusions and makes the mapping explicit
 */
export const ENTITY_FRONTMATTER_MAPPING = {
  types: "types",
  tags: "tags",
} as const

export const INTENT_FRONTMATTER_MAPPING = {
  status: "intent_status",
  parents: "intent_parents",
  relevantTo: "intent_relevant_to",
  tags: "tags",
} as const

export const OCCURRENCE_FRONTMATTER_MAPPING = {
  occurredAt: "occurrence_occurred_at",
  toProcess: "occurrence_to_process",
  participants: "occurrence_participants",
  intents: "occurrence_intents",
  location: "occurrence_location",
  tags: "tags",
} as const

/**
 * Interface properties that should never be stored in frontmatter
 * These are computed or runtime-only properties
 */
export const INTERFACE_ONLY_PROPERTIES = new Set<keyof CortexObject>([
  "file",
  "title",
])

/**
 * Properties that are computed dynamically and shouldn't be stored in frontmatter
 */
export const COMPUTED_PROPERTIES = new Set<string>(["children"])

/**
 * Transform a value before storing it in frontmatter based on the property type
 */
function transformValueForFrontmatter(key: string, value: any): any {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return undefined
  }

  // Handle Date objects - convert to ISO string with timezone
  if (value instanceof Date) {
    return toISOStringWithTimezone(value)
  }

  // Handle arrays of objects (like links) - convert to string format
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null &&
    value[0].target
  ) {
    return value
      .map(item => (item && item.target ? `[[${item.target}]]` : null))
      .filter(item => item !== null)
  }

  // Handle arrays with null values - filter out nulls
  if (Array.isArray(value) && value.some(item => item === null)) {
    return value.filter(item => item !== null)
  }

  // Handle single objects with target (like links) - convert to string format
  if (value && typeof value === "object" && value.target) {
    return `[[${value.target}]]`
  }

  return value
}

/**
 * Generic function to apply frontmatter updates using a property mapping
 */
export function applyFrontmatterUpdates<T extends CortexObject>(
  frontmatter: any,
  updates: Partial<T>,
  propertyMapping: Record<string, string>
): void {
  // Process mapped properties first (these take precedence)
  for (const [interfaceProperty, frontmatterField] of Object.entries(
    propertyMapping
  )) {
    if (updates[interfaceProperty as keyof T] !== undefined) {
      const value = updates[interfaceProperty as keyof T]
      const transformedValue = transformValueForFrontmatter(
        interfaceProperty,
        value
      )

      if (Array.isArray(transformedValue) && transformedValue.length === 0) {
        // Remove empty arrays
        delete frontmatter[frontmatterField]
      } else if (
        transformedValue !== undefined &&
        transformedValue !== null &&
        transformedValue !== ""
      ) {
        frontmatter[frontmatterField] = transformedValue
      } else {
        // Remove undefined/null/empty values
        delete frontmatter[frontmatterField]
      }
    }
  }

  // Process unmapped properties (but skip interface-only, computed, and already-mapped properties)
  const mappedInterfaceProperties = new Set(Object.keys(propertyMapping))
  const frontmatterFieldNames = new Set(Object.values(propertyMapping))

  for (const [key, value] of Object.entries(updates)) {
    const isInterfaceOnlyProperty = INTERFACE_ONLY_PROPERTIES.has(
      key as keyof CortexObject
    )
    const isComputedProperty = COMPUTED_PROPERTIES.has(key)
    const isAlreadyMappedProperty = mappedInterfaceProperties.has(key)
    const isFrontmatterFieldName = frontmatterFieldNames.has(key)

    if (
      !isInterfaceOnlyProperty &&
      !isComputedProperty &&
      !isAlreadyMappedProperty &&
      !isFrontmatterFieldName
    ) {
      const transformedValue = transformValueForFrontmatter(key, value)

      if (
        transformedValue !== undefined &&
        transformedValue !== null &&
        transformedValue !== ""
      ) {
        frontmatter[key] = transformedValue
      } else {
        // Remove undefined/null/empty values
        delete frontmatter[key]
      }
    }
  }
}

/**
 * Generic function to parse frontmatter using a property mapping
 */
export function parseFrontmatterToObject<T extends CortexObject>(
  frontmatter: any,
  file: TFile,
  propertyMapping: Record<string, string>
): Partial<T> {
  const result: any = {
    ...frontmatter, // Include all frontmatter properties first
    file,
    title: file.basename,
  }

  // Apply reverse mapping for known properties
  for (const [interfaceProperty, frontmatterField] of Object.entries(
    propertyMapping
  )) {
    if (frontmatter[frontmatterField] !== undefined) {
      result[interfaceProperty] = frontmatter[frontmatterField]
    }
  }

  return result
}

/**
 * Check if a property should be excluded from frontmatter processing
 */
export function shouldExcludeFromFrontmatter(
  propertyKey: string,
  propertyMapping: Record<string, string>
): boolean {
  const isInterfaceOnlyProperty = INTERFACE_ONLY_PROPERTIES.has(
    propertyKey as keyof CortexObject
  )
  const isComputedProperty = COMPUTED_PROPERTIES.has(propertyKey)
  const isMappedProperty = Object.keys(propertyMapping).includes(propertyKey)
  const isFrontmatterFieldName =
    Object.values(propertyMapping).includes(propertyKey)

  return (
    isInterfaceOnlyProperty ||
    isComputedProperty ||
    isMappedProperty ||
    isFrontmatterFieldName
  )
}
