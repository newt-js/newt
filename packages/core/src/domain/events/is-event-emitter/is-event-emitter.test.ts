import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { EVENT_EMITTER_BRAND } from './is-event-emitter'
import { isEventEmitter }      from './is-event-emitter'

describe('isEventEmitter', () => {
  test('sees the brand, whichever copy of the framework made it', () => {
    expect(isEventEmitter({ name: 'order.placed', [EVENT_EMITTER_BRAND]: true })).toBe(true)
    expect(isEventEmitter({ name: 'order.placed', [Symbol.for('@newt-js/core/event-emitter')]: true })).toBe(true)
  })

  test('is false for anything without it', () => {
    expect(isEventEmitter({ name: 'order.placed' })).toBe(false)
    expect(isEventEmitter(null)).toBe(false)
    expect(isEventEmitter('order.placed')).toBe(false)
  })
})
