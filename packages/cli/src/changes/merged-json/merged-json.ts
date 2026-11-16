export type MergedJson = { value: unknown, changed: boolean, conflicts: string[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** `current` with what `wanted` adds: missing keys, missing array items; a value it has that differs is kept, as a conflict. */
export function mergedJson(current: unknown, wanted: unknown, at = ''): MergedJson {
  if (isRecord(current) && isRecord(wanted)) {
    const value: Record<string, unknown> = { ...current }
    let changed = false
    const conflicts: string[] = []
    for (const [key, want] of Object.entries(wanted)) {
      if (!(key in current)) {
        value[key] = want
        changed = true
        continue
      }
      const merged = mergedJson(current[key], want, at ? `${at}.${key}` : key)
      value[key] = merged.value
      changed ||= merged.changed
      conflicts.push(...merged.conflicts)
    }
    return { value, changed, conflicts }
  }
  if (Array.isArray(current) && Array.isArray(wanted)) {
    const missing = wanted.filter(item => !current.some(each => same(each, item)))
    return { value: [...current, ...missing], changed: missing.length > 0, conflicts: [] }
  }
  if (same(current, wanted)) {
    return { value: current, changed: false, conflicts: [] }
  }
  return { value: current, changed: false, conflicts: [`${at} is ${JSON.stringify(current)}, newt's is ${JSON.stringify(wanted)}`] }
}
