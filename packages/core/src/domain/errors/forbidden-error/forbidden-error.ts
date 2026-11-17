import type { ErrorParams } from '../known-error/known-error'
import { KnownError }       from '../known-error/known-error'

export abstract class ForbiddenError<P extends ErrorParams = {}> extends KnownError<P> {
  readonly kind = 'forbidden'
}
