import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { isMethods } from './is-methods'

describe('isMethods', () => {
  test('an object whose every key is an HTTP method', () => {
    expect(isMethods({ GET: () => new Response() })).toBe(true)
    expect(isMethods({ HEAD: 1, OPTIONS: 2, TRACE: 3 })).toBe(true)
  })

  test('not an empty object, one with another key, nor an answer, a file, null or a function', () => {
    expect(isMethods({})).toBe(false)
    expect(isMethods({ GET: 1, get: 2 })).toBe(false)
    expect(isMethods(new Response())).toBe(false)
    expect(isMethods(new Blob(['x']))).toBe(false)
    expect(isMethods(null)).toBe(false)
    expect(isMethods(() => new Response())).toBe(false)
  })
})
