import { ConflictError } from '@newt-js/core'

export class SignInNotCompleted extends ConflictError {

  readonly code = 'signInSession.sign_in_not_completed'

  constructor() {
    super('Sign in not completed')
  }

}
