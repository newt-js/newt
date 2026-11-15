import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'

export function retryAfter(error: unknown): Record<string, string> {
  return error instanceof TooManyRequests ? { 'retry-after': String(error.params.retryAfterSeconds) } : {}
}
