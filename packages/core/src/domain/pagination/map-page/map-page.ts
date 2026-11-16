import type { Page } from '../page'

export function mapPage<T, R>(page: Page<T>, fn: (item: T) => R | undefined): Page<R> {
  return { ...page, items: page.items.map(fn).filter(item => item !== undefined) }
}
