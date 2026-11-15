import { Subscription }   from '../subscription/subscription'
import { EventHandler }   from './event-handler'
import { EventPublisher } from './event-publisher'

export interface EventBus extends EventPublisher {
  subscribe(pattern: string, handler: EventHandler, subscription?: Subscription): () => void
}
