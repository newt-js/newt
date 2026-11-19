import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { z }             from 'zod'
// --------------------------------------------------------
import { Entity }        from '../entity/entity'
import { forRepository } from '../for-repository/for-repository'

type CustomerDTO = { id: string, name: string }
type ProductDTO = { id: string, name: string }

const LineSchema = z.object({ productId: z.string(), quantity: z.number().int().positive() })
const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  sellerId: z.string().nullable(),
  parentId: z.string().nullable(),
  lines: z.array(LineSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
})

type OrderReferences = { customerId: CustomerDTO, sellerId: CustomerDTO, lines: { productId: ProductDTO } }
type OrderDTO = ReturnType<Order['toDTO']>

class Order extends Entity<typeof OrderSchema, typeof OrderSchema, OrderReferences> {
  static create(props: { customer: CustomerDTO, seller: CustomerDTO | null, lines: { product: ProductDTO, quantity: number }[] }) {
    return new Order(OrderSchema, { ...props, parentId: null }, true)
  }

  static fromDTO(dto: OrderDTO & { version: number }) {
    return new Order(OrderSchema, dto, false)
  }

  changeCustomer(customer: CustomerDTO) {
    this.change({ customer })
  }

  changeLines(lines: { product: ProductDTO, quantity: number }[]) {
    this.change({ lines })
  }

  get kept() {
    return this.data
  }
}

const ana = { id: 'c1', name: 'Bar Manolo' }
const pepe = { id: 'c2', name: 'Casa Pepe' }
const water = { id: 'p1', name: 'Agua' }
const bread = { id: 'p2', name: 'Pan' }

describe('an entity with references', () => {
  test('is given the entities it references, and shows them in its DTO', () => {
    const order = Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 2 }] })

    const dto = order.toDTO()

    expect(dto.customer).toEqual(ana)
    expect(dto.seller).toBeNull()
    expect(dto.lines).toEqual([{ product: water, quantity: 2 }])
    expect(dto).not.toHaveProperty('customerId')
    expect(dto.lines[0]).not.toHaveProperty('productId')
  })

  test('keeps only their ids: its data, and what a repository stores', () => {
    const order = Order.create({ customer: ana, seller: pepe, lines: [{ product: water, quantity: 2 }] })

    expect(order.kept).toMatchObject({ customerId: 'c1', sellerId: 'c2', lines: [{ productId: 'p1', quantity: 2 }] })
    expect(order[forRepository].storedFields()).toMatchObject({ customerId: 'c1', sellerId: 'c2', lines: [{ productId: 'p1', quantity: 2 }] })
    expect(order[forRepository].storedFields()).not.toHaveProperty('customer')
  })

  test('an id of its own kind is no reference: it stays an id', () => {
    const order = Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 1 }] })

    expect(order.toDTO().parentId).toBeNull()
  })

  test('a change takes the entity too, and its changes are ids', () => {
    const order = Order.fromDTO({ ...Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 2 }] }).toDTO(), version: 1 })

    order.changeCustomer(pepe)
    order.changeLines([{ product: water, quantity: 2 }, { product: bread, quantity: 1 }])

    expect(order.getChanges()).toEqual({ customerId: 'c2', lines: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] })
    expect(order.toDTO()).toMatchObject({ customer: pepe, lines: [{ product: water, quantity: 2 }, { product: bread, quantity: 1 }] })
  })

  test('the same entity, given again, changes nothing', () => {
    const order = Order.fromDTO({ ...Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 2 }] }).toDTO(), version: 1 })

    order.changeCustomer(ana)

    expect(order.getChanges()).toBeNull()
  })

  test('the DTO is a copy: changing it changes nothing', () => {
    const order = Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 2 }] })

    order.toDTO().customer.name = 'Otro'

    expect(order.toDTO().customer.name).toBe('Bar Manolo')
  })

  test('its types: the entity, never its id, in and out', () => {
    const order = Order.create({ customer: ana, seller: null, lines: [{ product: water, quantity: 2 }] })
    const dto = order.toDTO()

    const typed: { customer: CustomerDTO, seller: CustomerDTO | null, parentId: string | null, lines: { product: ProductDTO, quantity: number }[] } = dto
    // @ts-expect-error the DTO shows the entity, not its id
    void dto.customerId
    const wrong = () => {
      // @ts-expect-error an entity with references is given the entity, never its id alone
      Order.fromDTO({ id: 'o1', customerId: 'c1', sellerId: null, parentId: null, lines: [], createdAt: '', updatedAt: '', version: 1 })
    }
    expect(wrong).toBeFunction()
    expect(typed.customer).toEqual(ana)
  })
})
