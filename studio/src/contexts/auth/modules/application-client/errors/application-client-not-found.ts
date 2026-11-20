import { NotFoundError } from '@newt-js/core'

export class ApplicationClientNotFound extends NotFoundError {

  readonly code = 'applicationClient.not_found'

  constructor() {
    super('There is no such application client')
  }

}
