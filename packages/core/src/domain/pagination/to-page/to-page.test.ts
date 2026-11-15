import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { toPage }   from './to-page'

const cursor = (item: { id: string }) => item.id

describe('toPage', () => {
  test('the extra row only says more follow, and the next page starts after the last item', () => {
    expect(toPage([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { size: 2, cursor, total: 10 }))
      .toEqual({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'b', total: 10 })
  })

  test('without the extra row, it is the last page and has no cursor', () => {
    expect(toPage([{ id: 'a' }], { size: 2, cursor })).toEqual({ items: [{ id: 'a' }] })
    expect(toPage([], { size: 2, cursor })).toEqual({ items: [] })
  })
})
