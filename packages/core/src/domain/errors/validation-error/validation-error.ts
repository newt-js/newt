import { ErrorParams } from '../known-error/known-error'
import { KnownError }  from '../known-error/known-error'

export abstract class ValidationError<P extends ErrorParams = {}> extends KnownError<P> {
  readonly kind = 'validation'
}
