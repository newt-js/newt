import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { mediaType } from './media-type'

describe('mediaType', () => {
  test('is the type without its parameters, in lower case', () => {
    expect(mediaType('text/csv; charset=utf-8')).toBe('text/csv')
    expect(mediaType(' Text/CSV ')).toBe('text/csv')
    expect(mediaType('image/png')).toBe('image/png')
  })

  test('of nothing said is nothing', () => {
    expect(mediaType('')).toBe('')
  })
})
