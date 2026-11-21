import { UnauthorizedError } from '@newt-js/core'

export class InvalidToken extends UnauthorizedError {

  readonly code = 'oauthAuthorization.invalid_token'

  constructor() {
    super('The access token is wrong, expired, or not of this application')
  }

}
