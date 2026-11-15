import { isPlain } from '../is-plain/is-plain'

export function collectValues(value: object, add: (value: unknown) => void, seen = new Set<object>()): void {
  seen.add(value)
  for (const inner of Object.values(value)) {
    add(inner)
    if (isPlain(inner) && !seen.has(inner)) {
      collectValues(inner, add, seen)
    }
  }
}
