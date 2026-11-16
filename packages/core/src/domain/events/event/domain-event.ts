import type { Json } from './json'

export type DomainEvent<T extends Json = Json> = {
  id?: string
  name: string
  payload: T
  occurredAt: string
  actor?: string | null
}
