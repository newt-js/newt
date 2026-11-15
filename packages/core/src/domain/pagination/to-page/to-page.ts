import { Page } from '../page'

export type ToPageOptions<T> = {
  size: number
  cursor: (item: T) => string
  total?: number
}

export function toPage<T>(rows: T[], options: ToPageOptions<T>): Page<T> {
  const items = rows.slice(0, options.size)
  const last = items.at(-1)
  return {
    items,
    ...(rows.length > options.size && last !== undefined ? { nextCursor: options.cursor(last) } : {}),
    ...(options.total !== undefined ? { total: options.total } : {}),
  }
}
