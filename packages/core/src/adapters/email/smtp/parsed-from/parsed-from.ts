const NAMED = /^(.*)<([^<>\s]+@[^<>\s]+)>$/
const ADDRESS = /^[^<>\s]+@[^<>\s]+$/

/** `Shop <hello@shop.com>`, or the address alone, as its name and its address; null when it is neither. */
export function parsedFrom(text: string): { name: string, address: string } | null {
  const trimmed = text.trim()
  if (ADDRESS.test(trimmed)) return { name: '', address: trimmed }
  const [, name, address] = NAMED.exec(trimmed) ?? []
  if (name === undefined || address === undefined) return null
  return { name: name.trim().replace(/^"(.*)"$/, '$1'), address }
}
