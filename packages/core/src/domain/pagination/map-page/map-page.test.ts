import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { mapPage }  from './map-page'

describe('mapPage', () => {
  test('makes each item another, keeping the cursor and the total', () => {
    expect(mapPage({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'b', total: 5 }, item => item.id.toUpperCase()))
      .toEqual({ items: ['A', 'B'], nextCursor: 'b', total: 5 })
  })

  test('leaves out the ones it makes undefined', () => {
    expect(mapPage({ items: [{ user: 'ana' }, { user: 'gone' }] }, access => (access.user === 'gone' ? undefined : access.user)))
      .toEqual({ items: ['ana'] })
  })
})
