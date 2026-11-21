import { NotFoundError } from '@newt-js/core'

export class ApplicationNotFound extends NotFoundError {

  readonly code = 'application.not_found'

  constructor() {
    super('There is no such application')
  }

}
