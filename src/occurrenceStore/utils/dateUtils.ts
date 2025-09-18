/**
 * Remove the date prefix from the Occurrence file name
 * @param {string} basename - The file name to process
 * @param {string} format - The date format used in the file name
 * @returns {string} - The file name without the date prefix
 */
export function removeDatePrefix(basename: string, format: string): string {
  // Convert the format string to a regular expression pattern
  let regexPattern = format
    .replace("YYYY", "\\d{4}")
    .replace("MM", "\\d{2}")
    .replace("DD", "\\d{2}")
    .replace("HH", "\\d{2}")
    .replace("mm", "\\d{2}")
    .replace("ss", "\\d{2}")

  // Create regex from the pattern
  const dateRegex = new RegExp(regexPattern)

  // Replace the matched pattern with an empty string
  return basename.replace(dateRegex, "").trim()
}
/**
 * Apply the date prefix to the Occurrence file name
 * @param {string} title - The Occurrence title
 * @param {Date} date - The date to apply
 * @param {string} format - The date format to apply
 * @returns {string} - The file name with the date prefix
 */
export function applyDatePrefix(
  title: string,
  date: Date,
  format: string
): string {
  // Format the date according to the specified format
  const formattedDate = format
    .replace("YYYY", date.getFullYear().toString())
    .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("DD", String(date.getDate()).padStart(2, "0"))
    .replace("HH", String(date.getHours()).padStart(2, "0"))
    .replace("mm", String(date.getMinutes()).padStart(2, "0"))
    .replace("ss", String(date.getSeconds()).padStart(2, "0"))

  // Return the title with the date prefix
  return `${formattedDate} ${title}`
}

/**
 * Convert a Date object to an ISO 8601 string with timezone offset
 * @param {Date} date - The date to convert
 * @returns {string} - The ISO 8601 string with timezone offset
 */
export function toISOStringWithTimezone(date: Date): string {
  const localISOTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, -1)

  const offset = date.getTimezoneOffset()
  const offsetHours = Math.floor(Math.abs(offset) / 60)
  const offsetMinutes = Math.abs(offset) % 60
  const offsetSign = offset <= 0 ? "+" : "-"
  const offsetString = `${offsetSign}${offsetHours
    .toString()
    .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`

  return localISOTime + offsetString
}
