import { ValidationError } from '@newt-js/core'

export class UnsupportedGrantType extends ValidationError {

  readonly code = 'oauthAuthorization.unsupported_grant_type'

  constructor() {
    super('Only grant_type=authorization_code')
  }

}
