import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { ApiError }  from '../http/api-error'
import { ListStore } from './list-store'
import type { Page } from './page'

type Filters = { status?: string }

const pages: Record<string, Page<string>> = {
  'active:': { items: ['a1', 'a2'], nextCursor: 'c2', total: 3 },
  'active:c2': { items: ['a3'] },
  'closed:': { items: ['z1'] },
}

const fetchPage = async (filters: Filters, cursor: string | undefined) => pages[`${filters.status}:${cursor ?? ''}`]!

describe('ListStore', () => {
  test('loads the first page and then the next', async () => {
    const list = new ListStore(fetchPage)

    await list.load({ status: 'active' })
    expect(list.items.value).toEqual(['a1', 'a2'])
    expect(list.hasMore.value).toBe(true)
    expect(list.total.value).toBe(3)

    await list.more()
    expect(list.items.value).toEqual(['a1', 'a2', 'a3'])
    expect(list.hasMore.value).toBe(false)
  })

  test('drops an answer that arrives after a newer load', async () => {
    let release = () => {}
    const slow = new Promise<void>(resolve => { release = resolve })
    const list = new ListStore<string, Filters>(async (filters, cursor) => {
      if (filters.status === 'active') await slow
      return fetchPage(filters, cursor)
    })

    const old = list.load({ status: 'active' })
    await list.load({ status: 'closed' })
    release()
    await old

    expect(list.items.value).toEqual(['z1'])
  })

  test('keeps why it failed', async () => {
    const list = new ListStore(async () => { throw new ApiError(500, 'Something went wrong', 'internal') })

    await list.load({})

    expect(list.error.value).toBe('Something went wrong')
    expect(list.loading.value).toBe(false)
  })
})
