import { ConflictError } from '@newt-js/core'

export class SignInAttemptExpired extends ConflictError {

  readonly code = 'signInAttempt.expired'

  constructor() {
    super('The sign-in took too long: start again')
  }

}
