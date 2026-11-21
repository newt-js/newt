import { ConflictError } from '@newt-js/core'

export class UnexpectedSignInStep extends ConflictError {

  readonly code = 'signInAttempt.unexpected_step'

  constructor() {
    super('That is not the step this sign-in waits for')
  }

}
