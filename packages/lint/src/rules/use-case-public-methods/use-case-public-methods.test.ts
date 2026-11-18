import { MODULE }               from '../../testing/testing'
import { asRule }               from '../../testing/testing'
import { tester }               from '../../testing/testing'
import { useCasePublicMethods } from './use-case-public-methods'

const ORDER_MODULE = '/repo/src/contexts/ws/features/orders/modules/order/order.module.ts'
const moduleClass = (body: string) => `class Order_Module extends Module {\n${body}\n}`

tester.run('use-case-public-methods', asRule(useCasePublicMethods), {
  valid: [
    { code: moduleClass('@UseCase() async place(input: unknown) {}\n@UseCase({ retryOnConflict: false }) async cancel(id: string) {}'), filename: ORDER_MODULE },
    { code: moduleClass("static initialize(base: unknown) { return new Order_Module() }\nprivate constructor() { super('order') }"), filename: ORDER_MODULE },
    { code: moduleClass("private load(id: string) {}\nprotected check() {}\n#secret() {}\nget name() { return 'order' }\nset name(value: string) {}"), filename: ORDER_MODULE },
    { code: moduleClass('readonly events = {}\nprivate readonly helper = () => 1'), filename: ORDER_MODULE },
    { code: moduleClass('place(input: string): void\nplace(input: number): void\n@UseCase() place(input: unknown) {}'), filename: ORDER_MODULE },
    { code: moduleClass('static { }\n[key: string]: unknown\n@UseCase() place() {}'), filename: ORDER_MODULE },
    { code: 'class Order_Module extends core.Module { @core.UseCase() async place(input: unknown) {} }', filename: ORDER_MODULE },
    { code: "import { Module, UseCase as UC } from '@newt-js/core'\n" + moduleClass('@UC() async place(input: unknown) {}'), filename: ORDER_MODULE },
    { code: moduleClass('constructor(private readonly run: () => void, readonly name: string) { super() }'), filename: ORDER_MODULE },
    // Not a module: another class, or another file.
    { code: 'class Order_Helper { place() {} }', filename: ORDER_MODULE },
    { code: moduleClass('place() {}'), filename: `${MODULE}/price-change.ts` },
  ],
  invalid: [
    { code: moduleClass('async place(input: unknown) {}'), filename: ORDER_MODULE, errors: [{ messageId: 'method', data: { name: 'place', module: 'Order_Module' } }] },
    { code: moduleClass('public async place(input: unknown) {}\n@UseCase() cancel() {}'), filename: ORDER_MODULE, errors: [{ messageId: 'method' }] },
    { code: moduleClass('@Traced() place() {}'), filename: ORDER_MODULE, errors: [{ messageId: 'method' }] },
    { code: moduleClass('place = async (input: unknown) => {}'), filename: ORDER_MODULE, errors: [{ messageId: 'field' }] },
    { code: 'export default class extends core.Module { place() {} }', filename: ORDER_MODULE, errors: [{ messageId: 'method', data: { name: 'place', module: 'this module' } }] },
    { code: "import { Module as Base } from '@newt-js/core'\nclass O extends Base { async place(input: unknown) {} }", filename: ORDER_MODULE, errors: [{ messageId: 'method', data: { name: 'place', module: 'O' } }] },
    { code: moduleClass('place = this.run.bind(this)'), filename: ORDER_MODULE, errors: [{ messageId: 'field', data: { name: 'place', module: 'Order_Module' } }] },
    { code: moduleClass('place = wrap(async () => {})'), filename: ORDER_MODULE, errors: [{ messageId: 'field' }] },
    { code: moduleClass('constructor(public readonly place: () => Promise<void>) { super() }'), filename: ORDER_MODULE, errors: [{ messageId: 'field', data: { name: 'place', module: 'Order_Module' } }] },
    { code: moduleClass('constructor(readonly place: () => Promise<void>) { super() }'), filename: ORDER_MODULE, errors: [{ messageId: 'field' }] },
    // A module every context shares, outside modules/, is one too.
    { code: moduleClass('place() {}'), filename: '/repo/src/shared/outbox/outbox.module.ts', errors: [{ messageId: 'method' }] },
  ],
})
