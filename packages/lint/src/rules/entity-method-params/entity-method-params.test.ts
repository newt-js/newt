import { ORDER }              from '../../testing/testing'
import { asRule }             from '../../testing/testing'
import { tester }             from '../../testing/testing'
import { entityMethodParams } from './entity-method-params'

const ENTITY = `${ORDER}/order.ts`
const entityClass = (body: string) => `export class Order extends Entity<typeof OrderSchema> {\n${body}\n}`

tester.run('entity-method-params', asRule(entityMethodParams), {
  valid: [
    { code: entityClass('private constructor(input: EntityInput<OrderDTO>, isNew: boolean) { super(OrderSchema, input, isNew) }\nstatic fromDTO(dto: OrderDTO & { version: number }) {}'), filename: ENTITY },
    { code: entityClass('static place(input: OrderPlaceProps) {}\ncancel(reason: string, at: Date) {}\nprivate apply(dto: OrderDTO) {}'), filename: ENTITY },
    // Not the entity's file: a module, a value object.
    { code: entityClass('static place(input: OrderDTO) {}'), filename: `${ORDER}/order.module.ts` },
    { code: entityClass('static place(input: OrderDTO) {}'), filename: `${ORDER}/value-objects/order-total.ts` },
  ],
  invalid: [
    { code: entityClass('static place(input: OrderPlaceDTO) {}'), filename: ENTITY, errors: [{ messageId: 'dto', data: { method: 'place', entity: 'Order', name: 'OrderPlaceDTO', props: 'OrderPlaceProps' } }] },
    { code: entityClass("static place(input: Pick<OrderDTO, 'total'>) {}"), filename: ENTITY, errors: [{ messageId: 'dto' }] },
    { code: entityClass('static place(input: { total: number }) {}'), filename: ENTITY, errors: [{ messageId: 'inline' }] },
    { code: entityClass('cancel(change: OrderCancelDTO) {}'), filename: ENTITY, errors: [{ messageId: 'dto' }] },
    { code: 'export class PriceChange extends Entity<typeof PriceChangeSchema> {\nrecord(input: PriceChangeRecordDTO) {}\n}', filename: '/repo/src/contexts/ws/modules/price-change/price-change.ts', errors: [{ messageId: 'dto', data: { method: 'record', entity: 'PriceChange', name: 'PriceChangeRecordDTO', props: 'PriceChangeRecordProps' } }] },
  ],
})
