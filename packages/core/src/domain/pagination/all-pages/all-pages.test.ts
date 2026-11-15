import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { PageRequest } from '../page-request'
import { toPage }      from '../to-page/to-page'
import { allPages }    from './all-pages'

const ids = Array.from({ length: 250 }, (_, i) => ({ id: String(i).padStart(3, '0') }))

const read = (asked: PageRequest[]) => async (page: PageRequest) => {
  asked.push(page)
  const after = page.cursor ? ids.filter(item => item.id > page.cursor!) : ids
  return toPage(after.slice(0, page.size + 1), { size: page.size, cursor: item => item.id })
}

describe('allPages', () => {
  test('reads every page, a hundred at a time, each where the one before says', async () => {
    const asked: PageRequest[] = []

    expect(await allPages(read(asked))).toEqual(ids)
    expect(asked).toEqual([{ size: 100, cursor: undefined }, { size: 100, cursor: '099' }, { size: 100, cursor: '199' }])
  })

  test('reads pages of the size it is given', async () => {
    const asked: PageRequest[] = []

    expect(await allPages(read(asked), 200)).toEqual(ids)
    expect(asked.map(page => page.size)).toEqual([200, 200])
  })

  test('goes on after a page with nothing left in it, while it has a cursor', async () => {
    const pages = [{ items: [], nextCursor: 'gone' }, { items: [{ id: 'b' }] }]
    const asked: (string | undefined)[] = []

    expect(await allPages(async page => {
      asked.push(page.cursor)
      return pages.shift()!
    })).toEqual([{ id: 'b' }])
    expect(asked).toEqual([undefined, 'gone'])
  })
})
