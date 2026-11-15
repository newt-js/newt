export function eventNameOf(event: string): string {
  try {
    return String((JSON.parse(event) as { name?: unknown }).name ?? 'unknown')
  } catch {
    return 'unknown'
  }
}
