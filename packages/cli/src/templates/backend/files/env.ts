export function env(variables: Record<string, string | number>): string {
  return Object.entries(variables).map(([name, value]) => `${name}=${value}\n`).join('')
}
