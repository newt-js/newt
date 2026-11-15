import { ValidationError } from '../../errors/validation-error/validation-error'

export class TextWithNul extends ValidationError {
  readonly code = 'text_with_nul'
  constructor() {
    super('A value holds the NUL character or a lone surrogate, which the database cannot keep in text')
  }
}
