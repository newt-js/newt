import { z }                from 'zod'
// --------------------------------------------------------
import { now }              from '../../clock/now/now'
import type { DomainEvent } from '../event/domain-event'
import type { Json }        from '../event/json'
import { InvalidEvent }     from '../invalid-event/invalid-event'

type Nothing = null | undefined

type PrimitiveOf<B> = [B] extends [string] ? string : [B] extends [number] ? number : B

type Unbranded<T> =
  [Exclude<T, Nothing>] extends [never] ? T
    : [T] extends [z.$brand | Nothing] ? PrimitiveOf<Exclude<T, Nothing>> | Extract<T, Nothing>
      : [T] extends [readonly unknown[]] ? { [K in keyof T]: Unbranded<T[K]> }
        : [T] extends [Record<string, unknown>] ? { [K in keyof T]: Unbranded<T[K]> }
          : T

type SameInAndOut<Schema extends z.ZodType, In = z.input<Schema>, Out = Unbranded<z.output<Schema>>> = [In, Out] extends [Out, In] ? unknown : never

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
