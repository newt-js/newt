import { ValidationError } from '@newt-js/core'

/** Whatever was wrong in coming back from auth: one answer, so it tells nothing of which check failed. */
export class InvalidSignInCallback extends ValidationError {

  readonly code = 'signInAttempt.invalid_sign_in_callback'

  constructor() {
    super('The sign-in could not be finished: start again')
  }

}
