import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { migrationChecksum } from './migration-checksum'

describe('migrationChecksum', () => {
  test('is the SHA-256 of a script, whatever its line ends', () => {
    expect(migrationChecksum('SELECT 1;\n')).toHaveLength(64)
    expect(migrationChecksum('SELECT 1;\r\nSELECT 2;')).toBe(migrationChecksum('SELECT 1;\nSELECT 2;'))
    expect(migrationChecksum('SELECT 1;')).not.toBe(migrationChecksum('SELECT 2;'))
  })
})
