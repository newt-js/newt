import { NotFoundError } from '@newt-js/core'

export class SignInAttemptNotFound extends NotFoundError {

  readonly code = 'signInAttempt.not_found'

  constructor() {
    super('There is no such sign in attempt')
  }

}
