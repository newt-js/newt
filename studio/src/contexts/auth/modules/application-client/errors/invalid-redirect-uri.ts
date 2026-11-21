import { ValidationError } from '@newt-js/core'

export class InvalidRedirectUri extends ValidationError<{ value: string }> {

  readonly code = 'applicationClient.invalid_redirect_uri'

  constructor(value: string) {
    super(`'${value}' is not a valid redirect uri`, { value })
  }

}
