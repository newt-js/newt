import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { prefixOf } from './prefix-of'

describe('prefixOf', () => {
  test('the path without its trailing slashes; the root is the empty prefix', () => {
    expect(prefixOf('/backoffice/')).toBe('/backoffice')
    expect(prefixOf('/backoffice//')).toBe('/backoffice')
    expect(prefixOf('/a/b')).toBe('/a/b')
    expect(prefixOf('/')).toBe('')
  })

  test('a path that does not start with / is refused', () => {
    expect(() => prefixOf('')).toThrow('starts with /')
    expect(() => prefixOf('backoffice')).toThrow('starts with /: backoffice')
  })
})
