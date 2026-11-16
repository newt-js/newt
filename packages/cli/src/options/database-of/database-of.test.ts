import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_DATABASE } from './database-of'
import { databaseOf }       from './database-of'

test('the database given, sqlite by default', () => {
  expect(databaseOf('postgres')).toBe('postgres')
  expect(databaseOf(undefined)).toBe(DEFAULT_DATABASE)
  expect(DEFAULT_DATABASE).toBe('sqlite')
})

test('refuses one there is not, saying which there are', () => {
  expect(() => databaseOf('mongo')).toThrow("'mongo' is not a database: sqlite, postgres, mysql, memory")
})
