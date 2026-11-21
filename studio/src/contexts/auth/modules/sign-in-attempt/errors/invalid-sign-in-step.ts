import { ValidationError } from '@newt-js/core'

export class InvalidSignInStep extends ValidationError<{ value: string }> {

  readonly code = 'signInAttempt.invalid_sign_in_step'

  constructor(value: string) {
    super(`'${value}' is not a valid sign in step`, { value })
  }

}
