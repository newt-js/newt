import type { Json } from '../event/json'

/** A handler's queue: `<feature>[<module>].<use case>_on_<event>`. */
export type HandlerQueue = `${string}[${string}].${string}_on_${string}`

export type Subscription<TPayload extends Json = Json, TSeen extends TPayload = TPayload> = (
  | {
      strategy: 'fire-and-forget'
    }
  | {
      strategy: 'handler'
      queue: HandlerQueue
      attempts?: number
    }
) & {
  when?: ((payload: TPayload) => payload is TSeen) | ((payload: TPayload) => boolean)
}
