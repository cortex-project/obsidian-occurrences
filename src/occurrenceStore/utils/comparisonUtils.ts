/**
 * Check if two arrays of links are equal
 * @param {Array<{ type: string; target: string; displayText?: string }>} a - The first array of links
 * @param {Array<{ type: string; target: string; displayText?: string }>} b - The second array of links
 * @returns {boolean} - True if the arrays are equal, false otherwise
 */
export function linksArrayEqual(
  a: Array<{ type: string; target: string; displayText?: string }> | undefined,
  b: Array<{ type: string; target: string; displayText?: string }> | undefined
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every(
    (link, index) =>
      link.type === b[index].type &&
      link.target === b[index].target &&
      link.displayText === b[index].displayText
  )
}

/**
 * Check if two links are equal
 * @param {Object} a - The first link
 * @param {Object} b - The second link
 * @returns {boolean} - True if the links are equal, false otherwise
 */
export function linkEqual(
  a: { type: string; target: string; displayText?: string } | null,
  b: { type: string; target: string; displayText?: string } | null
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.type === b.type &&
    a.target === b.target &&
    a.displayText === b.displayText
  )
}

/**
 * Check if two arrays of strings are equal
 * @param {string[]} a - The first array of strings
 * @param {string[]} b - The second array of strings
 * @returns {boolean} - True if the arrays are equal, false otherwise
 */
export function arraysEqual(
  a: string[] | undefined,
  b: string[] | undefined
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}
