import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { it }            from 'bun:test'
// --------------------------------------------------------
import { ORDER }         from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { diagnosticsOf } from '../../testing/testing'
import { programOf }     from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { typedTester }   from '../../testing/testing'
import { useCaseParams } from './use-case-params'

const ORDER_MODULE = `${ORDER}/order.module.ts`
const moduleClass = (body: string) => `class Order_Module extends Module {\n${body}\n}`

tester.run('use-case-params', asRule(useCaseParams), {
  valid: [
    { code: moduleClass("@UseCase() async place(input: OrderPlaceDTO, page: PageRequest, id: OrderId, actorId: UserId | null, kind: 'a' | 'b') {}"), filename: ORDER_MODULE },
    // A private method, a field, another class: no use case.
    { code: moduleClass('private read(input: unknown) {}\nprivate check(input: { id: string }) {}'), filename: ORDER_MODULE },
    { code: 'class Order_Helper { @UseCase() place(input: unknown) {} }', filename: ORDER_MODULE },
    { code: moduleClass('@UseCase() async place(input: unknown) {}'), filename: `${ORDER}/order.test.ts` },
  ],
  invalid: [
    ...['unknown', 'any', 'unknown | undefined'].map(type => ({ code: moduleClass(`@UseCase() async place(input: ${type}) {}`), filename: ORDER_MODULE, errors: [{ messageId: 'nothing' }] })),
    { code: moduleClass('@UseCase() async place(input) {}'), filename: ORDER_MODULE, errors: [{ messageId: 'nothing' }] },
    { code: moduleClass('@UseCase() async place(id: OrderId, input = {}) {}'), filename: ORDER_MODULE, errors: [{ messageId: 'nothing' }] },
    { code: moduleClass('@UseCase() async place(input: { total: number }) {}'), filename: ORDER_MODULE, errors: [{ messageId: 'inline' }] },
    ...['string', 'number', 'boolean', 'bigint', 'string | undefined', 'string | null', 'string[]'].map(type => ({ code: moduleClass(`@UseCase() async place(id: ${type}) {}`), filename: ORDER_MODULE, errors: [{ messageId: 'bare' }] })),
  ],
})

const typedModule = (body: string) => `
declare namespace z { type input<T> = T; type infer<T> = T extends { parse(value: unknown): infer R } ? R : never }
declare const OrderPlaceSchema: { parse(value: unknown): { total: number }, safeParse(value: unknown): unknown }
declare const OrderSchema: { parse(value: unknown): { id: string } }
type OrderPlaceDTO = z.input<typeof OrderPlaceSchema>
type OrderDTO = z.infer<typeof OrderSchema>
type OrderId = string & { readonly brand: 'OrderId' }
declare function UseCase(): (target: unknown, context: ClassMethodDecoratorContext) => void
declare class Module {}
export class Order_Module extends Module {
${body}
}
`
const typedCases: [string, string?][] = [
  ['@UseCase() async place(input: OrderPlaceDTO) { return OrderPlaceSchema.parse(input) }'],
  ['@UseCase() async place(input: OrderPlaceDTO) { return OrderPlaceSchema.safeParse(input) }'],
  // Parsed by a private method it hands it to, at any place among its arguments.
  ['@UseCase() async place(id: OrderId, input: OrderPlaceDTO) { return this.open(id, input) }\nprivate open(id: OrderId, given: OrderPlaceDTO) { return OrderPlaceSchema.parse(given) }'],
  // An entity's DTO, what an event says: no input, nothing to parse.
  ['@UseCase() async record(order: OrderDTO) { return order.id }'],
  ['@UseCase() async place(input: OrderPlaceDTO) { return input }', 'unparsed'],
  ['@UseCase() async place(input: OrderPlaceDTO) { return OrderSchema.parse(input) }', 'unparsed'],
  ['@UseCase() async place(input: OrderPlaceDTO) { return this.open(input) }\nprivate open(given: OrderPlaceDTO) { return given }', 'unparsed'],
]
const cases = typedCases.map(([body, error], index) => ({ code: typedModule(body), filename: `${ORDER}/order${index}.module.ts`, error }))
const program = programOf(Object.fromEntries(cases.map(({ filename, code }) => [filename, code])))

typedTester(program).run('use-case-params, typed', asRule(useCaseParams), {
  valid: cases.filter(each => !each.error).map(({ code, filename }) => ({ code, filename })),
  invalid: cases.filter(each => each.error).map(({ code, filename, error }) => ({ code, filename, errors: [{ messageId: error! }] })),
})

describe('the program use-case-params is typed with', () => {
  it('has no errors of its own', () => {
    expect(diagnosticsOf(program)).toEqual([])
  })
})
