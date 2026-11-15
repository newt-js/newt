export type Page<T> = {
  items: T[]
  nextCursor?: string
  total?: number
}
