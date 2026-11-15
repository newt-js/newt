export function eventNameMatches(pattern: string, name: string): boolean {
  if (pattern === name) {
    return true
  }
  if (pattern.endsWith('.*')) {
    return name.startsWith(pattern.slice(0, -1))
  }
  return false
}
