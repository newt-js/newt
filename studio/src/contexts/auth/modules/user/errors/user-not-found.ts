import { NotFoundError } from '@newt-js/core'

export class UserNotFound extends NotFoundError {

  readonly code = 'user.not_found'

  constructor() {
    super('There is no such user')
  }

}
