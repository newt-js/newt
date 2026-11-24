import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { entityUpdated } from './entity-updated'

const entity = (body: string) => `export class Order extends Entity<typeof OrderSchema> {\n${body}\n}`

tester.run('entity-updated', asRule(entityUpdated), {
  valid: [
    // Updated, and what changed besides.
    { code: entity('cancel(now: Date): void {\nthis.change({ cancelledAt: now.toISOString() })\nthis.trackEvent(new Order_Updated(this.data))\nthis.trackEvent(new Order_Cancelled(this.data))\n}') },
    // Only when it changed.
    { code: entity('use(now: Date): void {\nif (this.data.usedAt === null) {\nthis.change({ usedAt: now.toISOString() })\nthis.trackEvent(new Order_Updated(this.data))\n}\n}') },
    // A method that changes nothing.
    { code: entity('get total(): number {\nreturn this.data.total\n}\nisLate(now: Date): boolean {\nreturn now > this.data.due\n}') },
    // A class that is not an entity.
    { code: 'export class Cart {\nadd(line) {\nthis.change({ line })\n}\n}' },
  ],
  invalid: [
    { code: entity('cancel(now: Date): void {\nthis.change({ cancelledAt: now.toISOString() })\n}'), errors: [{ messageId: 'notTold', data: { method: 'cancel' } }] },
    // Only an event that names what changed.
    { code: entity('rename(name: string): void {\nthis.change({ name })\nthis.trackEvent(new Order_Renamed(this.data))\n}'), errors: [{ messageId: 'notTold', data: { method: 'rename' } }] },
  ],
})
