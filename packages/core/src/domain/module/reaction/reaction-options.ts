import { Json } from '../../events/event/json'

export type ReactionOptions<TPayload extends Json, TSeen extends TPayload> = {
  queue?: `${string}.${string}.on.${string}.${string}`
  attempts?: number
  when?: ((payload: TPayload) => payload is TSeen) | ((payload: TPayload) => boolean)
}
