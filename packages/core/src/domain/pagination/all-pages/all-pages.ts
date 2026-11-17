import type { Page }        from '../page'
import type { PageRequest } from '../page-request'

export async function allPages<T>(read: (page: PageRequest) => Promise<Page<T>>, size = 100): Promise<T[]> {
  const items: T[] = []
  for (let cursor: string | undefined; ;) {
    const page = await read({ size, cursor })
    items.push(...page.items)
    cursor = page.nextCursor
    if (cursor === undefined) {
      return items
    }
  }
}
