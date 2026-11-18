import { MODULE }             from '../../testing/testing'
import { asRule }             from '../../testing/testing'
import { tester }             from '../../testing/testing'
import { routeBodyUnchecked } from './route-body-unchecked'

const ROUTES = '/repo/src/contexts/ws/features/orders/order/order.routes.ts'

tester.run('route-body-unchecked', asRule(routeBodyUnchecked), {
  valid: [
    { code: 'async (request: Request) => orders.place(await request.json())', filename: ROUTES },
    { code: 'async (request: Request) => { const body: unknown = await request.json(); return orders.place(body) }', filename: ROUTES },
    { code: 'async (request: Request) => orders.place(await request.json() as unknown)', filename: ROUTES },
    { code: 'async (request: Request) => orders.place(Schema.parse(await request.json()))', filename: ROUTES },
    { code: 'async (response: Response) => (await response.json()) as OrderDTO', filename: `${MODULE}/price-change.test.ts` },
    { code: 'const x = value as OrderPlaceDTO', filename: ROUTES },
    // What an upstream call answered is not the request's body.
    { code: 'async (request: Request) => { const upstream = await fetch(url); const token = await upstream.json() as ProviderToken; return tokens.open(token) }', filename: ROUTES },
  ],
  invalid: [
    { code: 'async (request: Request) => orders.place(await request.json() as OrderPlaceDTO)', filename: ROUTES, errors: [{ messageId: 'body', data: { type: 'OrderPlaceDTO' } }] },
    { code: 'async (request: Request) => orders.place((await request.json()) as OrderPlaceDTO)', filename: ROUTES, errors: [{ messageId: 'body' }] },
    { code: 'async (req: Request) => orders.place(<OrderPlaceDTO>await req.json())', filename: ROUTES, errors: [{ messageId: 'body' }] },
    { code: 'async (request: Request) => { const input: OrderPlaceDTO = await request.json(); return orders.place(input) }', filename: ROUTES, errors: [{ messageId: 'body' }] },
    { code: 'async (request: Request) => { const { id }: { id: string } = await request.json(); return orders.get(id) }', filename: ROUTES, errors: [{ messageId: 'body' }] },
    { code: 'async (request: Request) => orders.place(await (request.json() as Promise<OrderPlaceDTO>))', filename: ROUTES, errors: [{ messageId: 'body' }] },
    // Routes outside modules/ (a shared module's) too.
    { code: 'async (request: Request) => sessions.open(await request.json() as SessionDTO)', filename: '/repo/src/shared/web-session/web-session.routes.ts', errors: [{ messageId: 'body' }] },
  ],
})
