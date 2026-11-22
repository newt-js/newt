import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { EventBus } from './event-bus'

describe('EventBus', () => {
  test('tells those who listen to that name, with its payload', () => {
    const bus = new EventBus()
    const heard: unknown[] = []
    bus.on('client.updated', payload => heard.push(payload))
    bus.on('client.created', () => heard.push('other'))

    bus.emit('client.updated', { id: 'c-1' })

    expect(heard).toEqual([{ id: 'c-1' }])
  })

  test('an event from the server reaches them the same way', () => {
    const bus = new EventBus()
    const heard: string[] = []
    bus.on('client.updated', (_, event) => heard.push(`${event.name} at ${event.occurredAt}`))

    bus.receive({ name: 'client.updated', payload: { id: 'c-1' }, occurredAt: '2026-11-22T10:00:00.000Z' })

    expect(heard).toEqual(['client.updated at 2026-11-22T10:00:00.000Z'])
  })

  test('stops telling one who stopped listening', () => {
    const bus = new EventBus()
    let heard = 0
    const stop = bus.on('client.updated', () => heard++)

    stop()
    bus.emit('client.updated', { id: 'c-1' })

    expect(heard).toBe(0)
  })

  test('a listener gets a copy of the payload: what the emitter changes after does not reach it', () => {
    const bus = new EventBus()
    const payload = { ids: ['c-1'] }
    let heard: { ids: string[] } | undefined
    bus.on<{ ids: string[] }>('client.removed', got => {
      heard = got
    })

    bus.emit('client.removed', payload)
    payload.ids.push('c-2')

    expect(heard).toEqual({ ids: ['c-1'] })
  })

  test("refuses a name that is not a backend event's", () => {
    expect(() => new EventBus().emit('clientUpdated', {})).toThrow('<module>.<what-happened>')
  })

  test('a listener that fails does not keep the event from the rest', () => {
    const bus = new EventBus()
    let heard = 0
    bus.on('client.updated', () => {
      throw new Error('broken')
    })
    bus.on('client.updated', () => heard++)
    const original = globalThis.queueMicrotask
    globalThis.queueMicrotask = () => {}

    try {
      bus.emit('client.updated', {})
    } finally {
      globalThis.queueMicrotask = original
    }

    expect(heard).toBe(1)
  })
})
