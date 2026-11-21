import { UnauthorizedError } from '@newt-js/core'

export class WrongCredentials extends UnauthorizedError {

  readonly code = 'signInAttempt.wrong_credentials'

  constructor() {
    super('Wrong credentials')
  }

}
