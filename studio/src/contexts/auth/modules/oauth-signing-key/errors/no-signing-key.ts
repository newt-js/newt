import { ConflictError } from '@newt-js/core'

export class NoSigningKey extends ConflictError {

  readonly code = 'oauthSigningKey.no_signing_key'

  constructor() {
    super('auth has no signing key yet: it makes one when it starts')
  }

}
