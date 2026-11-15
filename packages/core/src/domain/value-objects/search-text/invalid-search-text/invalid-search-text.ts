import { ValidationError } from '../../../errors/validation-error/validation-error'

export class InvalidSearchText extends ValidationError<{ max: number }> {
  readonly code = 'invalid_search_text'
  constructor(max: number) {
    super(`A search takes at most ${max} characters`, { max })
  }
}
