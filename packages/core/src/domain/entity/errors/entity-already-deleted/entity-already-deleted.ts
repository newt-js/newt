import { EntityError } from '../entity-error/entity-error'

export class EntityAlreadyDeleted extends EntityError {
  constructor() {
    super('Entity is already deleted')
  }
}
