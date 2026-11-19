import { ValidationError } from '@newt-js/core'

export class InvalidUserCredentialKind
  extends ValidationError<{ value: string }> {

  readonly code = 'userCredential.invalid_user_credential_kind'

  constructor(value: string) {
    super(`'${value}' is not a valid user credential kind`, { value })
  }

}
