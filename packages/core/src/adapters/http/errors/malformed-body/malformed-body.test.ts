import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MalformedBody } from './malformed-body'

describe('MalformedBody', () => {
  test('is a validation error that says why', () => {
    const error = new MalformedBody(new SyntaxError('bad'))

    expect([error.kind, error.code]).toEqual(['validation', 'malformed_body'])
    expect(error.message).toBe('The body cannot be read as what was asked for')
  })
})
