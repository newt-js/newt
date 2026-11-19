import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { it }              from 'bun:test'
// --------------------------------------------------------
import { ORDER }           from '../../testing/testing'
import { asRule }          from '../../testing/testing'
import { diagnosticsOf }   from '../../testing/testing'
import { programOf }       from '../../testing/testing'
import { typedTester }     from '../../testing/testing'
import { useCaseResolved } from './use-case-resolved'

const typedModule = (body: string) => `
type Id<Name extends string> = string & { readonly brand: Name }
type OrderId = Id<'OrderId'>
type CustomerId = Id<'CustomerId'>
type ProductId = Id<'ProductId'>
type CustomerDTO = { id: CustomerId, name: string }
type ProductDTO = { id: ProductId, name: string }
type StoredOrder = { id: OrderId, customerId: CustomerId, lines: { productId: ProductId, quantity: number }[] }
type OrderDTO = { id: OrderId, customer: CustomerDTO, lines: { product: ProductDTO, quantity: number }[] }
type Page<T> = { items: T[], next: string | null }
declare function UseCase(): (target: unknown, context: ClassMethodDecoratorContext) => void
declare class Module {}
export class Order_Module extends Module {
${body}
}
`

const typedCases: [string, string[]?][] = [
  // Resolved: the entities in place of their ids, in a list, a page, alone.
  ['@UseCase() async get(id: string): Promise<OrderDTO> { return null! }'],
  ['@UseCase() async find(): Promise<OrderDTO[]> { return [] }'],
  ['@UseCase() async paginate(): Promise<Page<OrderDTO>> { return null! }'],
  // Nothing returned, a count, an id of its own: no reference.
  ['@UseCase() async remove(id: string): Promise<void> {}'],
  ['@UseCase() async count(): Promise<number> { return 0 }'],
  ['@UseCase() async place(): Promise<OrderId> { return null! }'],
  // An id of its own entity's kind, and a plain string, an id of another system.
  ['@UseCase() async get(id: string): Promise<{ id: OrderId, parentId: OrderId | null, stripeId: string }> { return null! }'],
  // A private method is no use case.
  ['private stored(): StoredOrder { return null! }'],
  // Stored ids, wherever they are.
  ['@UseCase() async get(id: string): Promise<StoredOrder> { return null! }', ['customerId', 'lines[].productId']],
  ['@UseCase() async find(): Promise<StoredOrder[]> { return [] }', ['[].customerId', '[].lines[].productId']],
  ['@UseCase() async paginate(): Promise<Page<StoredOrder>> { return null! }', ['items[].customerId', 'items[].lines[].productId']],
  ['@UseCase() async place(): Promise<{ id: OrderId, customerId: CustomerId | null }> { return null! }', ['customerId']],
  // A row: the stored order and its version, joined.
  ['@UseCase() async raw(): Promise<(StoredOrder & { version: number })[]> { return [] }', ['[].customerId', '[].lines[].productId']],
  ['@UseCase() get(id: string): { id: OrderId, customer: { id: CustomerId, regionId: Id<\'RegionId\'> } } { return null! }', ['customer.regionId']],
]
const cases = typedCases.map(([body, fields], index) => ({ code: typedModule(body), filename: `${ORDER}/order${index}.module.ts`, fields }))
const notAModule = { code: cases.at(-1)!.code, filename: `${ORDER}/order.test.ts` }
const program = programOf(Object.fromEntries([...cases, notAModule].map(({ filename, code }) => [filename, code])))

typedTester(program).run('use-case-resolved', asRule(useCaseResolved), {
  valid: [
    ...cases.filter(each => !each.fields).map(({ code, filename }) => ({ code, filename })),
    // Another file than a module's: not looked at.
    notAModule,
  ],
  invalid: cases.filter(each => each.fields).map(({ code, filename, fields }) => ({
    code,
    filename,
    errors: fields!.map(field => ({ messageId: 'stored' as const, data: { useCase: /@UseCase\(\) (?:async )?(\w+)/.exec(code)![1]!, field } })),
  })),
})

describe('the program use-case-resolved is typed with', () => {
  it('has no errors of its own', () => {
    expect(diagnosticsOf(program)).toEqual([])
  })
})
