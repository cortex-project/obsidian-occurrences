import { ObsidianLink } from "@/types"

/**
 * Parse an Obsidian link from a markdown string
 */
export function parseLink(linkText: string): ObsidianLink | null {
  // Parse wikilinks [[Target]] or [[Target|Alias]]
  const wikiLinkRegex = /\[\[(.*?)(?:#(.*?))?(?:\|(.*?))?\]\]/
  const wikiMatch = linkText.match(wikiLinkRegex)

  if (wikiMatch) {
    return {
      type: "wiki",
      target: wikiMatch[1] || "",
      section: wikiMatch[2] || undefined,
      displayText: wikiMatch[3] || wikiMatch[1] || "",
      alias: wikiMatch[3] || undefined,
    }
  }

  // Parse markdown links [Text](target)
  const markdownLinkRegex = /\[(.*?)\]\((.*?)\)/
  const markdownMatch = linkText.match(markdownLinkRegex)

  if (markdownMatch) {
    const target = markdownMatch[2]

    // Check if it's an obsidian:// URI
    if (target.startsWith("obsidian://")) {
      const uri = new URL(target)
      const params = new URLSearchParams(uri.search)

      return {
        type: "uri",
        target: params.get("file") || "",
        vault: params.get("vault") || undefined,
        displayText: markdownMatch[1],
      }
    }

    return {
      type: "markdown",
      target: target,
      displayText: markdownMatch[1],
    }
  }

  // Parse obsidian:// URIs
  const uriRegex = /obsidian:\/\/open\?file=(.*?)&vault=(.*)/
  const uriMatch = linkText.match(uriRegex)
  if (uriMatch) {
    return {
      type: "uri",
      target: decodeURIComponent(uriMatch[1]),
      vault: decodeURIComponent(uriMatch[2]),
      displayText: uriMatch[1],
    }
  }
  // If no match, return null

  return null
}

/**
 * Convert an ObsidianLink object to a markdown string
 */
export function formatLink(link: ObsidianLink): string {
  switch (link.type) {
    case "wiki":
      let wikiLink = `[[${link.target}`
      if (link.section) wikiLink += `#${link.section}`
      if (link.alias) wikiLink += `|${link.alias}`
      return wikiLink + "]]"

    case "markdown":
      return `[${link.displayText || link.target}](${link.target})`

    case "uri":
      let uri = `obsidian://open?file=${encodeURIComponent(link.target)}`
      if (link.vault) uri += `&vault=${encodeURIComponent(link.vault)}`
      return `[${link.displayText || link.target}](${uri})`

    default:
      return ""
  }
}

/**
 * Extract all links from a markdown string
 */
export function extractLinks(markdown: string): ObsidianLink[] {
  const links: ObsidianLink[] = []

  // Match all potential link patterns
  const wikiLinkPattern = /\[\[(.*?)\]\]/g
  const markdownLinkPattern = /\[(.*?)\]\((.*?)\)/g
  const uriLinkPattern = /obsidian:\/\/open\?file=(.*?)&vault=(.*)/g

  // Extract wikilinks
  let match
  while ((match = wikiLinkPattern.exec(markdown)) !== null) {
    const parsedLink = parseLink(match[0])
    if (parsedLink) links.push(parsedLink)
  }

  // Extract markdown links
  while ((match = markdownLinkPattern.exec(markdown)) !== null) {
    const parsedLink = parseLink(match[0])
    if (parsedLink) links.push(parsedLink)
  }
  // Extract URI links
  while ((match = uriLinkPattern.exec(markdown)) !== null) {
    const parsedLink = parseLink(match[0])
    if (parsedLink) links.push(parsedLink)
  }

  return links
}

/**
 * Check if a string is an link
 */
export function isLink(str: string): boolean {
  const wikiLinkRegex = /\[\[(.*?)(?:#(.*?))?(?:\|(.*?))?\]\]/
  const markdownLinkRegex = /\[(.*?)\]\((.*?)\)/
  const uriLinkRegex = /obsidian:\/\/open\?file=(.*?)&vault=(.*)/
  return (
    wikiLinkRegex.test(str) ||
    markdownLinkRegex.test(str) ||
    uriLinkRegex.test(str)
  )
}

/**
 * Convert a YAML list to a list of ObsidianLink objects if they are links
 * @param list - the frontmatter list
 * @returns - A list of ObsidianLink objects or an empty list
 * @example
 * const list = ["[[link1]]", "[[link2|alias]]", "text"]
 * const convertedList = convertListToLinks(list)
 * // convertedList = [
 * //   { type: "wiki", target: "link1" },
 * //   { type: "wiki", target: "link2", alias: "alias" }
 * // ]
 */
export function convertListToLinks(list: any): ObsidianLink[] {
  // Handle cases where the yaml doesn't match the expected format
  if (!Array.isArray(list) || (list.length === 1 && list[0] === null)) return []

  return list
    .map(link => parseLink(link))
    .filter((link): link is ObsidianLink => link !== null)
}
