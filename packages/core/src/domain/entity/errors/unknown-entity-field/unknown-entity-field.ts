import { EntityError } from '../entity-error/entity-error'

export class UnknownEntityField extends EntityError {
  constructor(field: string, reason?: string) {
    super(reason ? `Field '${field}' cannot be changed: ${reason}` : `Unknown field '${field}' for this entity`)
  }
}
