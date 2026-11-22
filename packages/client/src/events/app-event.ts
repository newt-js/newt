import type { Json } from './json'

/** Something that happened, as the backend writes its events: `client.updated`, its payload and when. */
export type AppEvent<PAYLOAD extends Json = Json> = {
  name: string
  payload: PAYLOAD
  occurredAt: string
}
