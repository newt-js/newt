import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { holdsModulesOrEvents } from './holds-modules-or-events'

const module = { name: 'product', useCaseRunner: { registry: { context: 'shop' } }, [Symbol.for('@newt-js/core/module')]: true }
const emitter = { name: 'order.placed', [Symbol.for('@newt-js/core/event-emitter')]: true }

describe('holdsModulesOrEvents', () => {
  test('finds a module or an event emitter however deep plain objects hold it', () => {
    expect(holdsModulesOrEvents({ product: module })).toBe(true)
    expect(holdsModulesOrEvents({ far: { away: { placed: emitter } } })).toBe(true)
  })

  test('finds none in a port of plain values, in arrays, or through a loop', () => {
    const loop: Record<string, unknown> = { port: 1 }
    loop.self = loop
    expect(holdsModulesOrEvents({ smtp: { host: 'mail' } })).toBe(false)
    expect(holdsModulesOrEvents({ list: [module] })).toBe(false)
    expect(holdsModulesOrEvents(loop)).toBe(false)
  })
})
