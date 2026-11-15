import { ZodError }    from 'zod'
// --------------------------------------------------------
import { log }         from '../../../../application/platform/log/log'
import { KnownError }  from '../../../../domain/errors/known-error/known-error'
import { errorAnswer } from '../error-answer/error-answer'
import { statusOf }    from '../status-of/status-of'

export function toErrorResponse(error: unknown): Response {
  const status = error instanceof KnownError ? statusOf(error.kind) : null
  if (error instanceof KnownError && status !== null) {
    const params = Object.keys(error.params).length > 0 ? { params: error.params } : {}
    return errorAnswer(status, { error: error.message, code: error.code, ...params }, error)
  }
  if (error instanceof ZodError) {
    return errorAnswer(400, { error: 'The input is not valid', code: 'validation', issues: error.issues }, error)
  }
  log.error('[http] unexpected error', { error })
  return errorAnswer(500, { error: 'Something went wrong', code: 'internal' }, error)
}
