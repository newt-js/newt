import { KnownError } from '../../../../domain/errors/known-error/known-error'

export class UnsupportedMediaType extends KnownError {
  readonly kind = 'unsupported_media_type'
  readonly code = 'unsupported_media_type'
  constructor() {
    super('The body is read as JSON: send it with content-type application/json')
  }
}
