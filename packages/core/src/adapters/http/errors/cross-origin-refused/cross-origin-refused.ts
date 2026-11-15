import { ForbiddenError } from '../../../../domain/errors/forbidden-error/forbidden-error'

export class CrossOriginRefused extends ForbiddenError {
  readonly code = 'cross_origin_refused'
  constructor() {
    super('A page of another origin may not send this')
  }
}
