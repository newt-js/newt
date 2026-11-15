import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { isNamePart } from './is-name-part'

describe('isNamePart', () => {
  test('letters of any script, digits, underscores and dollars are part of a name', () => {
    expect(['a', 'Z', 'ñ', 'ж', '7', '_', '$'].map(isNamePart)).toEqual([true, true, true, true, true, true, true])
  })

  test('spaces, punctuation and quotes are not', () => {
    expect([' ', ';', '(', "'", '"', '-', '\n'].map(isNamePart)).toEqual([false, false, false, false, false, false, false])
  })

  test('past either end of the text there is no name', () => {
    expect(isNamePart(undefined)).toBe(false)
  })
})
