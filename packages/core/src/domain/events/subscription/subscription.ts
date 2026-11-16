import type { Json } from '../event/json'

export type Subscription<TPayload extends Json = Json, TSeen extends TPayload = TPayload> = (
  | {
      strategy: 'fire-and-forget'
    }
  | {
      strategy: 'handler'
      queue: `${string}.${string}.on.${string}.${string}`
      attempts?: number
    }
) & {
  when?: ((payload: TPayload) => payload is TSeen) | ((payload: TPayload) => boolean)
}
