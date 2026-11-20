import { ValidationError } from '@newt-js/core'

export class MalformedOauthRequest extends ValidationError {

  readonly code = 'oauthAuthorization.malformed_oauth_request'

  constructor() {
    super('A parameter comes twice, or the client proves itself twice')
  }

}
