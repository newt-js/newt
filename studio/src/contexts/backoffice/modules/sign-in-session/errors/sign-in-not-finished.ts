import { ConflictError } from '@newt-js/core'

export class SignInNotFinished extends ConflictError {

  readonly code = 'signInSession.sign_in_not_finished'

  constructor() {
    super('Sign in not finished')
  }

}
