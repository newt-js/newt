import { ValidationError } from '@newt-js/core'

export class InvalidUserEmailLink extends ValidationError {

  readonly code = 'userEmailLink.invalid_user_email_link'

  constructor() {
    // One answer for a link that is wrong, used or expired: it tells nothing of which.
    super('This link does not work: it may be wrong, used or expired')
  }

}
