import { ValidationError } from '@newt-js/core'

export class InvalidGrant extends ValidationError {

  readonly code = 'oauthAuthorization.invalid_grant'

  constructor() {
    super('The code is wrong, used, expired, or not of this client and redirect_uri')
  }

}
