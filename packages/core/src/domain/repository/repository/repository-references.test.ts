import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { z }                 from 'zod'
// --------------------------------------------------------
import { MemoryDatabase }    from '../../../adapters/database/memory/memory-database/memory-database'
import { Entity }            from '../../entity/entity/entity'
import { ReferenceNotFound } from '../../errors/reference-not-found/reference-not-found'
import type { Loads }        from '../../module/resolve-reference/resolve-reference'
import { resolveReference }  from '../../module/resolve-reference/resolve-reference'
import type { Records }      from '../records/records'
import { Repository }        from './repository'
import type { ResolvedRow }  from './repository'

type CustomerDTO = { id: string, name: string }
type ProductDTO = { id: string, name: string }

const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  lines: z.array(z.object({ productId: z.string(), quantity: z.number() })),
  createdAt: z.string(),
  updatedAt: z.string(),
})
type OrderReferences = { customerId: CustomerDTO, lines: { productId: ProductDTO } }
type OrderRow = z.infer<typeof OrderSchema> & { version: number }

class Order extends Entity<typeof OrderSchema, typeof OrderSchema, OrderReferences> {
  static create(props: { customer: CustomerDTO, lines: { product: ProductDTO, quantity: number }[] }) {
    return new Order(OrderSchema, props, true)
  }

  static fromDTO(dto: ResolvedRow<OrderRow, Order>) {
    return new Order(OrderSchema, dto, false)
  }

  changeCustomer(customer: CustomerDTO) {
    this.change({ customer })
  }
}

class Orders extends Repository<Order, OrderRow> {
  constructor(database: MemoryDatabase, references: Loads<OrderReferences>) {
    super({ transactions: database, bus: { publish: () => {} } }, database.records<OrderRow>('orders'), { scope: 'none', references })
  }

  protected toEntity(row: ResolvedRow<OrderRow, Order>): Order {
    return Order.fromDTO(row)
  }

  get rows(): Records<OrderRow> {
    return this.records
  }
}

const catalogue = <R extends { id: string }>(...entities: R[]) => {
  const calls: string[][] = []
  return {
    calls,
    load: async (ids: string[]) => {
      calls.push(ids)
      return entities.filter(entity => ids.includes(entity.id))
    },
  }
}

const ana = { id: 'c1', name: 'Bar Manolo' }
const pepe = { id: 'c2', name: 'Casa Pepe' }
const water = { id: 'p1', name: 'Agua' }
const bread = { id: 'p2', name: 'Pan' }

function world() {
  const customers = catalogue(ana, pepe)
  const products = catalogue(water, bread)
  const references: Loads<OrderReferences> = { customerId: customers.load, lines: { productId: products.load } }
  const orders = new Orders(new MemoryDatabase(), references)
  return { customers, products, orders, references }
}

describe('a repository of entities with references', () => {
  test('stores their ids, and reads them back whole', async () => {
    const { orders } = world()
    const order = Order.create({ customer: ana, lines: [{ product: water, quantity: 2 }] })

    await orders.persist(order)

    const [row] = await orders.rows.find()
    expect(row).toMatchObject({ customerId: 'c1', lines: [{ productId: 'p1', quantity: 2 }] })
    expect(row).not.toHaveProperty('customer')
    const [read] = await orders.find({ id: order.id })
    expect(read?.toDTO()).toEqual(order.toDTO())
  })

  test('a read loads each reference once, for every entity and every line', async () => {
    const { orders, customers, products } = world()
    await orders.persist([
      Order.create({ customer: ana, lines: [{ product: water, quantity: 2 }, { product: bread, quantity: 1 }] }),
      Order.create({ customer: pepe, lines: [{ product: bread, quantity: 5 }] }),
      Order.create({ customer: ana, lines: [{ product: water, quantity: 1 }] }),
    ])

    const read = await orders.find()

    expect(read.map(order => order.toDTO().customer.name)).toEqual(['Bar Manolo', 'Casa Pepe', 'Bar Manolo'])
    expect(customers.calls).toEqual([['c1', 'c2']])
    expect(products.calls).toEqual([['p1', 'p2']])
  })

  test('a create resolves its input with the same loads: what it references, or ReferenceNotFound', async () => {
    const { orders, references } = world()
    const input = { customerId: 'c1', lines: [{ productId: 'p1', quantity: 2 }] }

    const [props] = await resolveReference([input], references)
    const order = Order.create(props!)
    await orders.persist(order)

    expect(order.toDTO()).toMatchObject({ customer: ana, lines: [{ product: water, quantity: 2 }] })
    await expect(resolveReference([{ ...input, customerId: 'gone' }], references)).rejects.toThrow(ReferenceNotFound)
  })

  test('a page of them is read whole', async () => {
    const { orders } = world()
    await orders.persist([Order.create({ customer: ana, lines: [] }), Order.create({ customer: pepe, lines: [] })])

    const page = await orders.paginate({}, { size: 1 })

    expect(page.items.map(order => order.toDTO().customer.id)).toEqual(['c1'])
  })

  test('nothing read, nothing loaded', async () => {
    const { orders, customers } = world()

    expect(await orders.find()).toEqual([])
    expect(customers.calls).toEqual([])
  })

  test('a change stores the new id', async () => {
    const { orders } = world()
    const order = Order.create({ customer: ana, lines: [] })
    await orders.persist(order)

    const [read] = await orders.find({ id: order.id })
    read!.changeCustomer(pepe)
    await orders.persist(read!)

    const [row] = await orders.rows.find()
    expect(row?.customerId).toBe('c2')
  })

  test('an id that names nothing any more is a ReferenceNotFound', async () => {
    const { orders } = world()
    await orders.persist(Order.create({ customer: { id: 'gone', name: 'Cerrado' }, lines: [] }))

    await expect(orders.find()).rejects.toThrow(ReferenceNotFound)
  })

  test('a repository whose entity references others must be told how they load', () => {
    const wrong = (database: MemoryDatabase) => class extends Repository<Order, OrderRow> {
      constructor() {
        // @ts-expect-error no references: its entity's could not be read
        super({ transactions: database, bus: { publish: () => {} } }, database.records<OrderRow>('orders'), { scope: 'none' })
      }

      protected toEntity(row: ResolvedRow<OrderRow, Order>) {
        return Order.fromDTO(row)
      }
    }
    expect(wrong).toBeFunction()
  })
})
