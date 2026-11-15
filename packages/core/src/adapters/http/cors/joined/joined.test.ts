import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { joined }   from './joined'

describe('joined', () => {
  test('both lists as one, each name once whatever its case, the first spelling kept', () => {
    expect(joined('Accept, Origin', 'origin')).toBe('Accept, Origin')
    expect(joined('ETag', 'etag, x-total')).toBe('ETag, x-total')
  })

  test('empty names are dropped', () => {
    expect(joined(' , Accept,', '')).toBe('Accept')
  })

  test('a list that says * is * alone', () => {
    expect(joined('*', 'origin')).toBe('*')
    expect(joined('Accept', ' * ')).toBe('*')
  })
})
