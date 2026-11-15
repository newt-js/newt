import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { fieldName } from './field-name'

describe('fieldName', () => {
  test('a snake_case column is read back as a camelCase field', () => {
    expect(fieldName('created_at')).toBe('createdAt')
    expect(fieldName('last_login_ip')).toBe('lastLoginIp')
  })

  // -----

  test('an underscore before a digit joins it too', () => {
    expect(fieldName('line_2')).toBe('line2')
  })

  // -----

  test('a column with no underscores is its own field', () => {
    expect(fieldName('id')).toBe('id')
  })
})
