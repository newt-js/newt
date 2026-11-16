import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { AlreadyReceived } from './already-received'

describe('AlreadyReceived', () => {
  test('names the event and the queue that reacted to it', () => {
    const error = new AlreadyReceived('e1', 'billing.invoice.on.order.placed')

    expect(error.name).toBe('AlreadyReceived')
    expect(error.event).toBe('e1')
    expect(error.queue).toBe('billing.invoice.on.order.placed')
    expect(error.message).toContain('billing.invoice.on.order.placed reacted to the event e1 already')
  })
})
