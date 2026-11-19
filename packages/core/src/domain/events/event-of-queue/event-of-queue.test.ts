import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { eventOfQueue }   from './event-of-queue'
import { queueOf }        from './event-of-queue'
import { useCaseOfQueue } from './event-of-queue'

describe('eventOfQueue', () => {
  test('is what follows `_on_` in a queue named after its module and use case', () => {
    expect(eventOfQueue('notification.orderPlaced_on_order.placed')).toBe('order.placed')
    expect(eventOfQueue('notification.orderPlaced_on_order.*')).toBe('order.*')
    expect(eventOfQueue('template.create_on_salesOrder.created')).toBe('salesOrder.created')
    expect(eventOfQueue('orderLine.priceAgain_on_price.changed')).toBe('price.changed')
    expect(eventOfQueue('template.create_on_order.created')).toBe('order.created')
  })

  test('is none for the old queue, <module>.<use case>.on.<event>, or a name not so made', () => {
    expect(eventOfQueue('notification.orderPlaced.on.order.placed')).toBeUndefined()
    expect(eventOfQueue('notification.orderPlaced.on.order.*')).toBeUndefined()
    expect(eventOfQueue('notification.order.placed_on_order.placed')).toBeUndefined()
    expect(eventOfQueue('notification_on_order.placed')).toBeUndefined()
  })

  test('is none for a queue of a feature, or one not so made', () => {
    expect(eventOfQueue('Campaigns[template].create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns[Template].create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('template.Create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('template.create.on.order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns.template.create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('template_on_order.created')).toBeUndefined()
  })
})

describe('useCaseOfQueue', () => {
  test('is what comes before the event, and none for the old queue', () => {
    expect(useCaseOfQueue('template.create_on_salesOrder.created')).toBe('template.create')
    expect(useCaseOfQueue('notification.orderPlaced.on.order.placed')).toBeUndefined()
    expect(useCaseOfQueue('not a queue')).toBeUndefined()
  })
})

describe('queueOf', () => {
  test('joins a module, its use case and the event with `_on_`', () => {
    expect(queueOf('template', 'create', 'salesOrder.created')).toBe('template.create_on_salesOrder.created')
    expect(queueOf('shopOrder', 'fulfil', 'order.placed')).toBe('shopOrder.fulfil_on_order.placed')
  })

  test('gives back a queue eventOfQueue reads', () => {
    expect(eventOfQueue(queueOf('template', 'create', 'salesOrder.created'))).toBe('salesOrder.created')
  })
})
