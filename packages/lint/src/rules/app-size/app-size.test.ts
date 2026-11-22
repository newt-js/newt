import { asRule }  from '../../testing/testing'
import { tester }  from '../../testing/testing'
import { appSize } from './app-size'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, inside = 'features/clients/clients-list.tsx') => ({ code, filename: `${APP}/${inside}`, options })

const lines = (count: number) => Array.from({ length: count }, (_, index) => `const line${index} = ${index}`).join('\n')

const nested = (depth: number) => `const page = ${'<Column>'.repeat(depth)}x${'</Column>'.repeat(depth)}`

const component = (body: string) => `function ClientsList() {\n${body}\n  return null\n}`

const reads = (hook: string, count: number) => Array.from({ length: count }, (_, index) => `  const v${index} = ${hook}(s${index})`).join('\n')

const service = (members: string) => `class ClientsService {\n${members}\n}`

const methods = (count: number) => Array.from({ length: count }, (_, index) => `  load${index}() {}`).join('\n')

tester.run('app-size', asRule(appSize), {
  valid: [
    at(lines(100)),
    at(`${lines(100)}\n\n\n`),
    at(nested(4)),
    at('const page = <><Column><Column><Column><Column>x</Column></Column></Column></Column></>'),
    at(component(`${reads('useService', 1)}\n${reads('useValue', 3)}`)),
    at('const ClientsRow = () => { const a = useValue(a); const b = useValue(b); const c = useValue(c); return null }'),
    at('function ClientsList() { const a = useValue(a); const b = useValue(b); return <Row render={function ClientsCell() { const c = useValue(c); const d = useValue(d); return null }} /> }'),
    at(lines(150), 'features/clients/clients.service.ts'),
    at(service(`${methods(7)}\n  private helper() {}\n  #secret() {}\n  protected guarded() {}`), 'features/clients/clients.service.ts'),
    at(service('  readonly a = inject(A)\n  readonly b = inject(B)\n  readonly c = inject(C)'), 'features/clients/clients.service.ts'),
    at(lines(300), 'features/clients/clients.api.ts'),
    { code: lines(300), filename: `${FOLDER}/sales/modules/order/order.ts`, options },
  ],
  invalid: [
    { ...at(lines(101)), errors: [{ messageId: 'componentLines', data: { count: 101, limit: 100, name: '' } }] },
    { ...at(nested(5)), errors: [{ messageId: 'jsxDepth', data: { count: 5, limit: 4, name: '' } }] },
    { ...at(nested(7)), errors: [{ messageId: 'jsxDepth' }] },
    { ...at(component(reads('useService', 2))), errors: [{ messageId: 'services', data: { count: 2, limit: 1, name: 'ClientsList' } }] },
    { ...at(component(reads('useValue', 4))), errors: [{ messageId: 'values', data: { count: 4, limit: 3, name: 'ClientsList' } }] },
    { ...at(lines(151), 'features/clients/clients.service.ts'), errors: [{ messageId: 'serviceLines', data: { count: 151, limit: 150, name: '' } }] },
    { ...at(service(methods(8)), 'features/clients/clients.service.ts'), errors: [{ messageId: 'serviceMethods', data: { count: 8, limit: 7, name: 'ClientsService' } }] },
    { ...at(service('  readonly a = inject(A)\n  readonly b = inject(B)\n  readonly c = inject(C)\n  readonly d = inject(D)'), 'features/clients/clients.service.ts'), errors: [{ messageId: 'serviceInjects', data: { count: 4, limit: 3, name: 'ClientsService' } }] },
  ],
})
