import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { NotSignedIn } from './not-signed-in'

describe('NotSignedIn', () => {
  test('is a unauthorized error that says why', () => {
    const error = new NotSignedIn()

    expect([error.kind, error.code]).toEqual(['unauthorized', 'not_signed_in'])
    expect(error.message).toBe('Sign in first')
  })
})
