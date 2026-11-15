import { KnownError } from '../../../../domain/errors/known-error/known-error'

export class MethodNotAllowed extends KnownError<{ method: string, path: string }> {
  readonly kind = 'method_not_allowed'
  readonly code = 'method_not_allowed'
  constructor(method: string, path: string) {
    super(`${path} does not take ${method}`, { method, path })
  }
}
