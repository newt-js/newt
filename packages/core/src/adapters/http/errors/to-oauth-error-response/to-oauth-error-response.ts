import { ZodError }         from 'zod'
// --------------------------------------------------------
import { log }              from '../../../../application/platform/log/log'
import { KnownError }       from '../../../../domain/errors/known-error/known-error'
import { MalformedBody }    from '../malformed-body/malformed-body'
import { MethodNotAllowed } from '../method-not-allowed/method-not-allowed'
import { retryAfter }       from '../retry-after/retry-after'
import { statusOf }         from '../status-of/status-of'

export function toOauthErrorResponse(error: unknown, fallback: string, codes: Record<string, string> = {}): Response {
  const answer = (status: number, code: string, description: string) =>
    Response.json({ error: code, error_description: description }, { status, headers: { 'cache-control': 'no-store', ...retryAfter(error) } })

  if (error instanceof SyntaxError || error instanceof MalformedBody) {
    return answer(400, fallback, 'The input is not valid')
  }
  if (error instanceof MethodNotAllowed) {
    return answer(405, codes[error.code] ?? 'invalid_request', error.message)
  }
  const status = error instanceof KnownError ? statusOf(error.kind) : null
  if (error instanceof KnownError && status !== null) {
    return answer(status, codes[error.code] ?? fallback, error.message)
  }
  if (error instanceof ZodError) {
    return answer(400, fallback, error.issues[0]?.message ?? 'The input is not valid')
  }
  log.error('[oauth] unexpected error', { error })
  return answer(500, 'server_error', 'Something went wrong')
}
