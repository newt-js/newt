import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { MAX_IN }            from '../../criteria/filter/max-in'
import { ReferenceNotFound } from '../../errors/reference-not-found/reference-not-found'
import { resolveReference }  from './resolve-reference'

type Project = { id: string, name: string }
type User = { id: string, email: string }
type Task = { id: string, title: string, projectId: string, assigneeId: string | null }
type Customer = { id: string, name: string }
type Product = { id: string, name: string }
type Order = { id: string, customerId: string, lines: { productId: string, quantity: number }[] }

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

const task = (id: string, projectId: string, assigneeId: string | null = null): Task => ({ id, title: `Task ${id}`, projectId, assigneeId })
const order = (id: string, customerId: string, ...lines: [string, number][]): Order => ({
  id,
  customerId,
  lines: lines.map(([productId, quantity]) => ({ productId, quantity })),
})

describe('resolveReference', () => {
  test('each id becomes the entity it names, under its own field', async () => {
    const projects = catalogue({ id: 'p1', name: 'Web' })

    const resolved = await resolveReference([task('t1', 'p1')], {
      projectId: projects.load,
    })

    expect(resolved).toEqual([{ id: 't1', title: 'Task t1', assigneeId: null, project: { id: 'p1', name: 'Web' } }])
  })

  test('the stored id leaves the result', async () => {
    const projects = catalogue({ id: 'p1', name: 'Web' })

    const [resolved] = await resolveReference([task('t1', 'p1')], {
      projectId: projects.load,
    })

    expect(resolved).not.toHaveProperty('projectId')
  })

  test('a reference loads once for the whole list, with its distinct ids', async () => {
    const projects = catalogue({ id: 'p1', name: 'Web' }, { id: 'p2', name: 'App' })

    await resolveReference([task('t1', 'p1'), task('t2', 'p2'), task('t3', 'p1')], {
      projectId: projects.load,
    })

    expect(projects.calls).toEqual([['p1', 'p2']])
  })

  test(`loads ${MAX_IN} ids at a time`, async () => {
    const many = Array.from({ length: MAX_IN * 2 + 1 }, (_, at) => ({ id: `p${at}`, name: `Project ${at}` }))
    const projects = catalogue(...many)

    const resolved = await resolveReference(many.map(project => task(`t-${project.id}`, project.id)), {
      projectId: projects.load,
    })

    expect(projects.calls.map(ids => ids.length)).toEqual([MAX_IN, MAX_IN, 1])
    expect(resolved.map(each => each.project.name)).toEqual(many.map(project => project.name))
  })

  test('resolves several references, each with its own load', async () => {
    const projects = catalogue({ id: 'p1', name: 'Web' })
    const users = catalogue({ id: 'u1', email: 'ana@example.com' })

    const resolved = await resolveReference([task('t1', 'p1', 'u1')], {
      projectId: projects.load,
      assigneeId: users.load,
    })

    expect(resolved).toEqual([{
      id: 't1',
      title: 'Task t1',
      project: { id: 'p1', name: 'Web' },
      assignee: { id: 'u1', email: 'ana@example.com' },
    }])
    expect(projects.calls).toHaveLength(1)
    expect(users.calls).toHaveLength(1)
  })

  test('a null id is null, and is not loaded', async () => {
    const projects = catalogue({ id: 'p1', name: 'Web' })
    const users = catalogue<User>()

    const [resolved] = await resolveReference([task('t1', 'p1', null)], {
      projectId: projects.load,
      assigneeId: users.load,
    })

    expect(resolved?.assignee).toBeNull()
    expect(users.calls).toEqual([])
  })

  test('an absent id is null', async () => {
    const users = catalogue<User>()

    const [resolved] = await resolveReference([{ id: 'c1' } as { id: string, ownerId?: string }], {
      ownerId: users.load,
    })

    expect(resolved).toEqual({ id: 'c1', owner: null })
  })

  test('an empty list loads nothing', async () => {
    const projects = catalogue<Project>()

    expect(await resolveReference([] as Task[], { projectId: projects.load })).toEqual([])
    expect(projects.calls).toEqual([])
  })

  test('an id that names nothing is a ReferenceNotFound naming the field', async () => {
    const projects = catalogue<Project>()

    const failure = resolveReference([task('t1', 'gone')], { projectId: projects.load })

    await expect(failure).rejects.toThrow(ReferenceNotFound)
    await expect(failure).rejects.toThrow('The project gone does not exist')
  })

  test('resolves the references of the lists an item holds, one load for every list', async () => {
    const customers = catalogue<Customer>({ id: 'c1', name: 'Bar Manolo' }, { id: 'c2', name: 'Casa Pepe' })
    const products = catalogue<Product>({ id: 'p1', name: 'Agua' }, { id: 'p2', name: 'Pan' })

    const resolved = await resolveReference([
      order('o1', 'c1', ['p1', 2], ['p2', 1]),
      order('o2', 'c2', ['p2', 5]),
    ], {
      customerId: customers.load,
      lines: { productId: products.load },
    })

    expect(resolved).toEqual([
      {
        id: 'o1',
        customer: { id: 'c1', name: 'Bar Manolo' },
        lines: [
          { product: { id: 'p1', name: 'Agua' }, quantity: 2 },
          { product: { id: 'p2', name: 'Pan' }, quantity: 1 },
        ],
      },
      { id: 'o2', customer: { id: 'c2', name: 'Casa Pepe' }, lines: [{ product: { id: 'p2', name: 'Pan' }, quantity: 5 }] },
    ])
    expect(customers.calls).toEqual([['c1', 'c2']])
    expect(products.calls).toEqual([['p1', 'p2']])
  })

  test('an id in a list that names nothing is a ReferenceNotFound', async () => {
    const customers = catalogue<Customer>({ id: 'c1', name: 'Bar Manolo' })
    const products = catalogue<Product>()

    const failure = resolveReference([order('o1', 'c1', ['gone', 1])], {
      customerId: customers.load,
      lines: { productId: products.load },
    })

    await expect(failure).rejects.toThrow('The product gone does not exist')
  })

  test('the type of a list: its items resolved', async () => {
    const customers = catalogue<Customer>({ id: 'c1', name: 'Bar Manolo' })
    const products = catalogue<Product>({ id: 'p1', name: 'Agua' })

    const resolved = await resolveReference([order('o1', 'c1', ['p1', 2])], {
      customerId: customers.load,
      lines: { productId: products.load },
    })

    const typed: { id: string, customer: Customer, lines: { product: Product, quantity: number }[] }[] = resolved
    // @ts-expect-error the stored id of a line is not in the result
    void resolved[0]?.lines[0]?.productId
    expect(typed).toHaveLength(1)
  })

  test('its type: the entity in place of the id, nullable only where the id is', async () => {
    const projects = catalogue<Project>({ id: 'p1', name: 'Web' })
    const users = catalogue<User>()

    const resolved = await resolveReference([task('t1', 'p1')], {
      projectId: projects.load,
      assigneeId: users.load,
    })

    const typed: { id: string, title: string, project: Project, assignee: User | null }[] = resolved
    // @ts-expect-error the stored id is not in the result
    void resolved[0]?.projectId
    const wrong = () => [
      // @ts-expect-error a field that is not `<name>Id` is no reference
      resolveReference([task('t1', 'p1')], { title: projects.load }),
      // @ts-expect-error a field the item does not have is no reference
      resolveReference([task('t1', 'p1')], { ownerId: users.load }),
    ]
    expect(wrong).toBeFunction()
    expect(typed).toHaveLength(1)
  })
})
