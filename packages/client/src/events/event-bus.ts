import type { AppEvent } from './app-event'
import type { Json }     from './json'

type Handler = (event: AppEvent) => void

/** A name as the backend's events have it: the module, a dot, what happened (`sign-in-attempt.completed`). */
const EVENT_NAME = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/

/**
 * How features hear what another changed, without holding its state: one emits `client.updated`, those that
 * show clients listen and load again. The server's events, in real time, come in through `receive`, so a feature
 * never knows whether an event came from the app or from the backend. A service gets it with `inject(EventBus)`.
 */
export class EventBus {

  private readonly handlers = new Map<string, Set<Handler>>()

  /** Hears every event of that name, until the function it gives back is called: call it in the service's `dispose`. */
  on<PAYLOAD extends Json>(name: string, handler: (payload: PAYLOAD, event: AppEvent<PAYLOAD>) => void): () => void {
    const named = this.handlersOf(name)
    const listener: Handler = event => handler(event.payload as PAYLOAD, event as AppEvent<PAYLOAD>)
    named.add(listener)
    return () => named.delete(listener)
  }

  /** Tells every listener, with a copy of the payload as JSON gives it back: what a listener gets cannot change under it. */
  emit(name: string, payload: Json): void {
    this.receive({ name, payload, occurredAt: new Date().toISOString() })
  }

  /** An event that comes from elsewhere, the server's: delivered as if the app had emitted it. */
  receive(event: AppEvent): void {
    if (!EVENT_NAME.test(event.name)) throw new Error(`'${event.name}' is not an event's name: <module>.<what-happened>`)
    const delivered = JSON.parse(JSON.stringify(event)) as AppEvent
    for (const handler of [...this.handlersOf(event.name)]) {
      try {
        handler(delivered)
      } catch (error) {
        // One listener that fails does not keep the event from the rest.
        queueMicrotask(() => {
          throw error
        })
      }
    }
  }

  private handlersOf(name: string): Set<Handler> {
    const named = this.handlers.get(name) ?? new Set<Handler>()
    this.handlers.set(name, named)
    return named
  }
}
