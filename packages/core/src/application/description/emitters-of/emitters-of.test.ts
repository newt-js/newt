import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { emittersOf } from './emitters-of'

const emitter = (name: string) => ({ name, [Symbol.for('@newt-js/core/event-emitter')]: true })

describe('emittersOf', () => {
  test('finds the emitters a module holds, alone or in a plain object', () => {
    const placed = emitter('order.placed')
    const paid = emitter('order.paid')
    const instance = { name: 'order', placed, events: { paid }, count: 1 }

    expect(emittersOf({ instance, className: 'Order', deps: undefined, useCases: new Map() })).toEqual([placed, paid] as never)
  })

  test('leaves out the emitters it was given in its deps', () => {
    const own = emitter('order.placed')
    const given = emitter('tax.changed')
    const deps = { billing: { changed: given } }
    const instance = { name: 'order', own, deps, changed: given }

    expect(emittersOf({ instance, className: 'Order', deps, useCases: new Map() })).toEqual([own] as never)
  })
})
