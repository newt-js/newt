import { ORDER }          from '../../testing/testing'
import { asRule }         from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { useCaseBatched } from './use-case-batched'

const ORDER_MODULE = `${ORDER}/order.module.ts`
const orderModule = (body: string) => `export class Order_Module extends Module {\n@UseCase()\nasync place(input: OrderPlaceDTO) {\n${body}\n}\n}`

tester.run('use-case-batched', asRule(useCaseBatched), {
  valid: [
    // One call for every id, then each taken from what it gave.
    { code: orderModule(`
      const products = await this.deps.catalog.product.find({ field: 'id', op: 'in', value: input.lines.map(line => line.productId) })
      return input.lines.map(line => ({ product: referenced(products, line.productId, 'product'), quantity: line.quantity }))
    `), filename: ORDER_MODULE },
    // The list a loop reads, and the start of a for, run once.
    { code: orderModule('for (const product of await this.deps.catalog.product.find({})) { total += product.price }'), filename: ORDER_MODULE },
    { code: orderModule('for (let found = await this.deps.catalog.product.find({}); found.length; found = []) { }'), filename: ORDER_MODULE },
    // Its own use cases, and its repository, in a loop: not another module.
    { code: orderModule('for (const id of input.ids) { await this.get(id) }'), filename: ORDER_MODULE },
    { code: orderModule('await Promise.all(input.ids.map(id => this.orders.find({ id })))'), filename: ORDER_MODULE },
    // A callback a list does not run per item.
    { code: orderModule("const later = () => this.deps.catalog.product.find({})\nsetTimeout(() => this.deps.catalog.product.find({}), 0)"), filename: ORDER_MODULE },
    // The loads initialize gives its repository: no this.deps, and not in a use case.
    { code: "export class Order_Module extends Module {\nstatic initialize(base, router, deps) {\nreturn new Order_Module(base, new Order_Repository(base, { customerId: ids => deps.customers.customer.find({ field: 'id', op: 'in', value: ids }) }), router, deps)\n}\n}", filename: ORDER_MODULE },
    // Another file than a module's.
    { code: orderModule('for (const id of input.ids) { await this.deps.catalog.product.get(id) }'), filename: `${ORDER}/order.test.ts` },
  ],
  invalid: [
    { code: orderModule('return Promise.all(input.lines.map(line => this.deps.catalog.product.get(line.productId)))'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.catalog.product.get', loop: '.map()' } }] },
    { code: orderModule('for (const line of input.lines) { await this.deps.catalog.product.get(line.productId) }'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.catalog.product.get', loop: 'for…of' } }] },
    { code: orderModule('for (let at = 0; at < ids.length; at++) { await this.deps.customer.find({ id: ids[at] }) }'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.customer.find', loop: 'for' } }] },
    { code: orderModule('while (next) { next = await this.deps.customer.get(next) }'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.customer.get', loop: 'while' } }] },
    { code: orderModule('input.ids.forEach(async id => { await this.deps.customer.get(id) })'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.customer.get', loop: '.forEach()' } }] },
    { code: orderModule('await input.lines.reduce(async (sum, line) => (await sum) + (await this.deps.catalog.product.get(line.productId)).price, Promise.resolve(0))'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.catalog.product.get', loop: '.reduce()' } }] },
    // Nested deep in the callback, still once per item.
    { code: orderModule('return input.lines.flatMap(line => { if (line.quantity > 0) { return [this.deps.catalog.product.get(line.productId)] } return [] })'), filename: ORDER_MODULE, errors: [{ messageId: 'perItem', data: { call: 'this.deps.catalog.product.get', loop: '.flatMap()' } }] },
  ],
})
