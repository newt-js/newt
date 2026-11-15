export function joined(first: string, second: string): string {
  const names = `${first},${second}`.split(',').map(name => name.trim()).filter(Boolean)
  if (names.includes('*')) {
    return '*'
  }
  return names.filter((name, i) => names.findIndex(other => other.toLowerCase() === name.toLowerCase()) === i).join(', ')
}
