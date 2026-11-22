/** What was wrong with one field of what was sent: `field` is its path, `address.city`. */
export type FieldIssue = {
  field: string
  message: string
}

/** The issues of a backend's answer, as zod writes them (`path` and `message`), keyed by their field. */
export function issuesOf(body: unknown): FieldIssue[] {
  const issues = (body as { issues?: unknown } | null)?.issues
  if (!Array.isArray(issues)) return []
  return issues.flatMap(issue => {
    const { path, message } = issue as { path?: unknown, message?: unknown }
    if (!Array.isArray(path) || typeof message !== 'string') return []
    return [{ field: path.map(String).join('.'), message }]
  })
}
