import { EntityError } from '../entity-error/entity-error'

export class SaveRolledBack extends EntityError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was in a save that rolled back: read it again, and save that one`)
  }
}
