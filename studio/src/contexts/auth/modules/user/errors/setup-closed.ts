import { ConflictError } from '@newt-js/core'

/** The setup has done its job: auth has its first admin, password and all. */
export class SetupClosed extends ConflictError {

  readonly code = 'user.setup_closed'

  constructor() {
    super('auth has its first admin already')
  }

}
