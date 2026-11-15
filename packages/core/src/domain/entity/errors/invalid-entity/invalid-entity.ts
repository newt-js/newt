import { z }           from 'zod'
// --------------------------------------------------------
import { EntityError } from '../entity-error/entity-error'

export class InvalidEntity extends EntityError {
  constructor(entity: string, id: string, error: z.ZodError, field?: string) {
    const where = (path: PropertyKey[]) => [field, ...path].filter(each => each !== undefined).map(String).join('.') || '(root)'
    super(`${entity} ${id} does not pass its schema: ${error.issues.map(issue => `${where(issue.path)}: ${issue.message}`).join('; ')}`)
    this.cause = error
  }
}
