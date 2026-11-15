import { retryAfter } from '../retry-after/retry-after'
import { ErrorBody }  from '../to-error-response/error-body'

export function errorAnswer(status: number, body: ErrorBody, error: unknown): Response {
  return Response.json(body, { status, headers: retryAfter(error) })
}
