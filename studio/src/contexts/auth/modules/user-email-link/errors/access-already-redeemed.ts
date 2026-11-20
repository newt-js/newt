import { ConflictError } from '@newt-js/core'

export class AccessAlreadyRedeemed extends ConflictError {

  readonly code = 'userEmailLink.access_already_redeemed'

  constructor() {
    super('This user already set its password from its access email: it signs in as anyone else')
  }

}
