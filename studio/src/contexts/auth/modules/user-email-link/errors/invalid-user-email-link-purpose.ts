import { ValidationError } from '@newt-js/core'

export class InvalidUserEmailLinkPurpose
  extends ValidationError<{ value: string }> {

  readonly code = 'userEmailLink.invalid_user_email_link_purpose'

  constructor(value: string) {
    super(`'${value}' is not a valid user email link purpose`, { value })
  }

}
