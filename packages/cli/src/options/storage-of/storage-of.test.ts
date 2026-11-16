import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_STORAGE } from './storage-of'
import { storageOf }       from './storage-of'

test('the storage given, local by default', () => {
  expect(storageOf('s3')).toBe('s3')
  expect(storageOf(undefined)).toBe(DEFAULT_STORAGE)
  expect(DEFAULT_STORAGE).toBe('local')
})

test('refuses one there is not, saying which there are', () => {
  expect(() => storageOf('ftp')).toThrow("'ftp' is not a storage for files: local, s3, memory")
})
