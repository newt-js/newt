import { asRule }         from '../../testing/testing'
import { programOf }      from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { typedTester }    from '../../testing/testing'
import { appSignalReads } from './app-signal-reads'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, inside = 'features/clients/clients-list.tsx') => ({ code, filename: `${APP}/${inside}`, options })

tester.run('app-signal-reads', asRule(appSignalReads), {
  valid: [
    at('function ClientsList() { const items = useValue(clients.items); return null }'),
    at('function ClientsList() { return <Button onClick={() => { if (clients.items.value.length === 0) load() }}>Load</Button> }'),
    at('function ClientsList() { useEffect(() => { void clients.items.value }, []); return null }'),
    at('function ClientsList() { const onChange = (event) => set(event.target.value); return null }'),
    at('const total = clients.items.value.length', 'features/clients/clients.service.ts'),
    at('function load() { return clients.items.value }'),
  ],
  invalid: [
    { ...at('function ClientsList() { const items = clients.items.value; return null }'), errors: [{ messageId: 'render', data: { name: 'ClientsList' } }] },
    { ...at('const ClientsList = () => <Text>{clients.count.value}</Text>'), errors: [{ messageId: 'render', data: { name: 'ClientsList' } }] },
    { ...at('function ClientsList() { clients.count.value++; return null }'), errors: [{ messageId: 'render' }] },
  ],
})

const TYPED = `${APP}/features/clients/clients-typed.tsx`

const TYPES = 'type Signal<T> = { value: T, peek(): T, subscribe(run: (value: T) => void): () => void }\ndeclare const count: Signal<number>\ndeclare const field: { value: string }\n'

const typed = (body: string) => `${TYPES}export function ClientsTyped() {\n${body}\n  return null\n}\n`

typedTester(programOf({ [TYPED]: typed('  const read = count.value\n  const own = field.value') })).run('app-signal-reads, with types', asRule(appSignalReads), {
  valid: [],
  invalid: [
    // A signal's .value is reported; what is not a signal is let be.
    { code: typed('  const read = count.value\n  const own = field.value'), filename: TYPED, options, errors: [{ messageId: 'render', line: 5 }] },
  ],
})
