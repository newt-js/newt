import { z }                from 'zod'
// --------------------------------------------------------
import { now }              from '../../clock/now/now'
import type { DomainEvent } from '../event/domain-event'
import type { Json }        from '../event/json'
import { InvalidEvent }     from '../invalid-event/invalid-event'

type SameInAndOut<Schema extends z.ZodType> = [z.input<Schema>, z.output<Schema>] extends [z.output<Schema>, z.input<Schema>] ? unknown : never

export function defineEvent<const Name extends string, Schema extends z.ZodType<Json, Json>>(name: Name, schema: Schema & SameInAndOut<Schema>) {
  return class implements DomainEvent<z.output<Schema>> {
    static readonly eventName = name
    readonly name = name
    readonly occurredAt = now().toISOString()
    readonly payload: z.output<Schema>

    constructor(payload: z.output<Schema>) {
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        throw new InvalidEvent(name, parsed.error)
      }
      this.payload = parsed.data
    }
  }
}
