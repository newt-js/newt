import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { columnName } from './column-name'

describe('columnName', () => {
  test('a camelCase field is kept in a snake_case column', () => {
    expect(columnName('createdAt')).toBe('created_at')
    expect(columnName('lastLoginIp')).toBe('last_login_ip')
  })

  // -----

  test('a field with no capitals is its own column', () => {
    expect(columnName('id')).toBe('id')
    expect(columnName('line2')).toBe('line2')
  })
})
