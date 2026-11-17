import type { EventMeta }       from '../../events/event/event-meta'
import type { Json }            from '../../events/event/json'
import type { ReactionOptions } from './reaction-options'

export type Reaction<UseCase, TPayload extends Json, TSeen extends TPayload> =
  UseCase extends (...values: infer Args) => unknown
    ? [] extends Args
      ? [args?: (payload: TSeen, meta: EventMeta) => Args, options?: ReactionOptions<TPayload, TSeen>]
      : [args: (payload: TSeen, meta: EventMeta) => Args, options?: ReactionOptions<TPayload, TSeen>]
    : never
