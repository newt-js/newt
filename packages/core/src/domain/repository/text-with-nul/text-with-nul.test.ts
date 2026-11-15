import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { TextWithNul } from './text-with-nul'

describe('TextWithNul', () => {
  test('is a validation error: text no database of newt keeps', () => {
    const error = new TextWithNul()

    expect(error.kind).toBe('validation')
    expect(error.code).toBe('text_with_nul')
    expect(error.message).toContain('lone surrogate')
  })
})
