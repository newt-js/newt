import type { Json }         from '../../events/event/json'
import type { HandlerQueue } from '../../events/subscription/subscription'

export type ReactionOptions<TPayload extends Json, TSeen extends TPayload> = {
  queue?: HandlerQueue
  attempts?: number
  when?: ((payload: TPayload) => payload is TSeen) | ((payload: TPayload) => boolean)
}
