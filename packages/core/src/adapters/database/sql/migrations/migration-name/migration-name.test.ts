import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { migrationName } from './migration-name'

describe('migrationName', () => {
  test('is its version, five digits, and its name', () => {
    expect(migrationName(3, 'product-code')).toBe('00003_product-code')
  })
})
