import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { codePoint } from './code-point'

describe('codePoint', () => {
  test('goes by the column collation when the column has one', () => {
    expect(codePoint({ collation: 'C', provider: 'i' })).toBe(true)
    expect(codePoint({ collation: 'pg_c_utf8' })).toBe(true)
    expect(codePoint({ collation: 'en_US.utf8', provider: 'b' })).toBe(false)
  })

  // -----

  test('without a column collation, goes by the database: builtin compares by code point, libc only with a C-like collation, ICU never', () => {
    expect(codePoint({ collation: null, provider: 'b' })).toBe(true)
    expect(codePoint({ collation: null, provider: 'c', databaseCollation: 'POSIX' })).toBe(true)
    expect(codePoint({ collation: null, provider: 'c', databaseCollation: 'en_US.utf8' })).toBe(false)
    expect(codePoint({ provider: 'i', databaseCollation: 'C' })).toBe(false)
  })
})
