import { UnauthorizedError } from '@newt-js/core'

export class InvalidClient extends UnauthorizedError {

  readonly code = 'oauthAuthorization.invalid_client'

  constructor() {
    super('The client is unknown here, or its secret is wrong')
  }

}
