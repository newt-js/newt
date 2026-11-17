import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { storesOf } from './stores-of'

test('sqlite, local files and a cluster in memory when none is given', () => {
  expect(storesOf({})).toEqual({ cluster: 'memory', database: 'sqlite', files: 'local' })
})

test('the ones given', () => {
  expect(storesOf({ cluster: 'valkey', db: 'postgres', files: 's3' })).toEqual({ cluster: 'valkey', database: 'postgres', files: 's3' })
})

test('refuses one there is not, saying which there are', () => {
  expect(() => storesOf({ db: 'mongo' })).toThrow("'mongo' is not a database: sqlite, postgres, mysql, memory")
  expect(() => storesOf({ files: 'ftp' })).toThrow("'ftp' is not a storage for files: local, s3, memory")
  expect(() => storesOf({ cluster: 'redis' })).toThrow("'redis' is not a cluster: memory or valkey")
})
