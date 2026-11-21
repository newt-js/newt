import { ValidationError } from '@newt-js/core'

export class InvalidAuthorizationRequest extends ValidationError {

  readonly code = 'oauthAuthorization.invalid_authorization_request'

  constructor() {
    super('This client does not exist here, or does not have that redirect_uri')
  }

}
