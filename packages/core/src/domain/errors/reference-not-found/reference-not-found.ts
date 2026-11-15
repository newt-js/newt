import { ValidationError } from '../validation-error/validation-error'

export class ReferenceNotFound extends ValidationError<{ resource: string, id: string }> {
  readonly code = 'reference_not_found'
  constructor(resource: string, id: string) {
    super(`The ${resource} ${id} does not exist`, { resource, id })
  }
}
