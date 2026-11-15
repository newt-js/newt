import { ValidationError } from '../../../errors/validation-error/validation-error'

export class InvalidSecretToken extends ValidationError {
  readonly code = 'invalid_secret_token'
  constructor() {
    super('The token is not valid')
  }
}
