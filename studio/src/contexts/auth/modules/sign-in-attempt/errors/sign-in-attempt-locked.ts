import { ConflictError } from '@newt-js/core'

export class SignInAttemptLocked extends ConflictError {

  readonly code = 'signInAttempt.locked'

  constructor() {
    super('Too many wrong answers: start again')
  }

}
