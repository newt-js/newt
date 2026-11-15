import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { isMissing } from './is-missing'

describe('isMissing', () => {
  test('an error of no such key is a missing file', () => {
    expect(isMissing(Object.assign(new Error('gone'), { code: 'NoSuchKey' }))).toBe(true)
  })

  test('any other error is not', () => {
    expect(isMissing(Object.assign(new Error('denied'), { code: 'AccessDenied' }))).toBe(false)
    expect(isMissing(new Error('no code'))).toBe(false)
  })
})
