export type ErrorBody = {
  error: string
  code: string
  params?: Record<string, unknown>
  issues?: unknown[]
}
