import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { eventOfQueue }   from './event-of-queue'
import { queueOf }        from './event-of-queue'
import { useCaseOfQueue } from './event-of-queue'

describe('eventOfQueue', () => {
  test('is what follows `_on_` in a queue named after its feature, module and use case', () => {
    expect(eventOfQueue('notifications[notification].orderPlaced_on_order.placed')).toBe('order.placed')
    expect(eventOfQueue('notifications[notification].orderPlaced_on_order.*')).toBe('order.*')
    expect(eventOfQueue('campaigns[template].create_on_sales[order].created')).toBe('sales[order].created')
    expect(eventOfQueue('salesOrders[orderLine].priceAgain_on_prices[price].changed')).toBe('prices[price].changed')
    expect(eventOfQueue('campaigns[template].create_on_order.created')).toBe('order.created')
  })

  test('is none for the old queue of a module of no feature, <module>.<use case>.on.<event>, or a name not so made', () => {
    expect(eventOfQueue('notification.orderPlaced.on.order.placed')).toBeUndefined()
    expect(eventOfQueue('notification.orderPlaced.on.order.*')).toBeUndefined()
    expect(eventOfQueue('notifications[notification].order.placed_on_order.placed')).toBeUndefined()
    expect(eventOfQueue('notifications[notification]_on_order.placed')).toBeUndefined()
  })

  test('is none for a queue of a feature not so made', () => {
    expect(eventOfQueue('Campaigns[template].create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns[Template].create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns[template].Create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns[template].create.on.order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns.template.create_on_order.created')).toBeUndefined()
    expect(eventOfQueue('campaigns[template]_on_order.created')).toBeUndefined()
  })
})

describe('useCaseOfQueue', () => {
  test('is what comes before the event, and none for the old queue of a module of no feature', () => {
    expect(useCaseOfQueue('campaigns[template].create_on_sales[order].created')).toBe('campaigns[template].create')
    expect(useCaseOfQueue('notification.orderPlaced.on.order.placed')).toBeUndefined()
    expect(useCaseOfQueue('not a queue')).toBeUndefined()
  })
})

describe('queueOf', () => {
  test('joins a module of a feature, its use case and the event with `_on_`', () => {
    expect(queueOf('campaigns[template]', 'create', 'sales[order].created')).toBe('campaigns[template].create_on_sales[order].created')
    expect(queueOf('shop[order]', 'fulfil', 'order.placed')).toBe('shop[order].fulfil_on_order.placed')
  })

  test('gives back a queue eventOfQueue reads', () => {
    expect(eventOfQueue(queueOf('campaigns[template]', 'create', 'sales[order].created'))).toBe('sales[order].created')
  })
})
