import { PathPattern } from '../path-pattern/path-pattern'

export function paramsOf(pattern: PathPattern, values: string[]): Record<string, string> {
  return Object.fromEntries(pattern.names.map((name, i) => [name, values[i]!]))
}
