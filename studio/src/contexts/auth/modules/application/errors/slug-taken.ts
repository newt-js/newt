import { ConflictError } from '@newt-js/core'

export class SlugTaken extends ConflictError {

  readonly code = 'application.slug_taken'

  constructor() {
    super('There is already an application with that slug')
  }

}
