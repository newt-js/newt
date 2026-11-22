import type { ReadonlySignal } from '@preact/signals-core'
import { computed }            from '@preact/signals-core'
// --------------------------------------------------------
import { ApiError }            from '../http/api-error'
import { Store }               from '../store/store'
import type { Page }           from './page'

type ListState<ITEM> = {
  items: ITEM[]
  nextCursor: string | undefined
  total: number | undefined
  loading: boolean
  /** Why the last load failed. */
  error: string | null
}

/** How a list asks for one page: with the filters it shows and, after the first, the cursor of the next. */
export type PageFetcher<ITEM, FILTERS> = (filters: FILTERS, cursor: string | undefined) => Promise<Page<ITEM>>

/**
 * A list from the backend, page by page: what a feature's service holds for a list screen, as a field. Loading
 * with other filters starts again, and an answer that arrives after a newer load is dropped, so a person who
 * changes the filter fast never sees an old list.
 */
export class ListStore<ITEM, FILTERS = Record<string, never>> {

  private readonly store = new Store<ListState<ITEM>>({ items: [], nextCursor: undefined, total: undefined, loading: false, error: null })
  private generation = 0
  private filters: FILTERS | null = null
  readonly items = this.store.select('items')
  readonly total = this.store.select('total')
  readonly loading = this.store.select('loading')
  readonly error = this.store.select('error')
  readonly hasMore: ReadonlySignal<boolean> = computed(() => this.store.select('nextCursor').value !== undefined)

  constructor(private readonly fetchPage: PageFetcher<ITEM, FILTERS>) {}

  /** The first page with these filters, in place of what there was. */
  async load(filters: FILTERS): Promise<void> {
    this.filters = filters
    this.store.patch({ items: [], nextCursor: undefined, total: undefined })
    await this.fetch(undefined, [])
  }

  /** The next page, after the ones there are. */
  async more(): Promise<void> {
    const { nextCursor, loading, items } = this.store.value
    if (this.filters === null || nextCursor === undefined || loading) return
    await this.fetch(nextCursor, items)
  }

  /** The first page again, with the same filters: after something in it changed. */
  async reload(): Promise<void> {
    if (this.filters !== null) await this.load(this.filters)
  }

  /** Changes the items it holds without asking the backend: after creating, editing or deleting one. */
  change(change: (items: ITEM[]) => ITEM[]): void {
    this.store.update(({ items }) => ({ items: change(items) }))
  }

  private async fetch(cursor: string | undefined, before: ITEM[]): Promise<void> {
    const generation = ++this.generation
    this.store.patch({ loading: true, error: null })
    try {
      const page = await this.fetchPage(this.filters as FILTERS, cursor)
      if (generation !== this.generation) return
      this.store.patch({ items: [...before, ...page.items], nextCursor: page.nextCursor, total: page.total, loading: false })
    } catch (error) {
      if (generation !== this.generation) return
      this.store.patch({ loading: false, error: error instanceof ApiError ? error.message : 'Something went wrong' })
      if (!(error instanceof ApiError)) throw error
    }
  }
}
