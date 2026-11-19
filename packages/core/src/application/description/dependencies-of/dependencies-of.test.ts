import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { Feature }        from '../../../domain/feature/feature/feature'
import { UseCaseRunner }  from '../../../domain/use-case/use-case-runner/use-case-runner'
import { dependenciesOf } from './dependencies-of'

const module = { name: 'tax', useCaseRunner: { registry: { context: 'billing' } }, [Symbol.for('@newt-js/core/module')]: true }
const placed = { name: 'order.placed', [Symbol.for('@newt-js/core/event-emitter')]: true }
const paid = { name: 'order.paid', [Symbol.for('@newt-js/core/event-emitter')]: true }

describe('dependenciesOf', () => {
  test('tells a module by its id and an emitter by the module that owns it', () => {
    const owners = new Map([[placed, 'shop/order']]) as never

    expect(dependenciesOf({ tax: module, placed }, owners)).toEqual([
      { name: 'tax', kind: 'module', target: 'billing/tax' },
      { name: 'placed', kind: 'events', target: 'shop/order', events: ['order.placed'] },
    ])
  })

  test('takes a group of events of one owner as one dependency', () => {
    const owners = new Map([[placed, 'shop/order'], [paid, 'shop/order']]) as never

    expect(dependenciesOf({ orders: { placed, paid } }, owners)).toEqual([
      { name: 'orders', kind: 'events', target: 'shop/order', events: ['order.placed', 'order.paid'] },
    ])
  })

  test('goes inside plain objects that hold modules, and takes anything else as a port', () => {
    const loop: Record<string, unknown> = { tax: module }
    loop.self = loop

    expect(dependenciesOf({ far: { tax: module, other: { host: 'mail' }, size: 1 }, mailer: { send: () => {} }, loop, nothing: undefined }, new Map())).toEqual([
      { name: 'far.tax', kind: 'module', target: 'billing/tax' },
      { name: 'far.other', kind: 'port', target: null },
      { name: 'mailer', kind: 'port', target: null },
      { name: 'loop.tax', kind: 'module', target: 'billing/tax' },
    ])
  })

  test("tells a feature by the feature's id", () => {
    class Contacts_Feature extends Feature {}
    const contacts = new Contacts_Feature('contacts', { useCaseRunner: new UseCaseRunner({ context: 'engagement' }) }, {})

    expect(dependenciesOf({ contacts }, new Map())).toEqual([{ name: 'contacts', kind: 'feature', target: 'engagement/contacts' }])
  })
})
