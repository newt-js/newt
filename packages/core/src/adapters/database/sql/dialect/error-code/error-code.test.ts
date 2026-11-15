import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { errorCode } from './error-code'

describe('errorCode', () => {
  test('is the database\'s own code of an error, whatever its driver calls it', () => {
    expect(errorCode({ errno: '23505', code: 'ERR_POSTGRES_SERVER_ERROR' })).toBe('23505')
    expect(errorCode({ errno: 1062 })).toBe('1062')
    expect(errorCode({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe('SQLITE_CONSTRAINT_UNIQUE')
    expect(errorCode(null)).toBe('')
  })
})
