import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { appComponents } from './app-components'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, inside = 'components/sessions-map.tsx') => ({ code, filename: `${APP}/${inside}`, options })

const WHY = '/**\n * The map of the sessions open now.\n * Why: @newt-js/react has no map, and only this app shows one.\n */\nexport function SessionsMap() { return null }'

tester.run('app-components', asRule(appComponents), {
  valid: [
    at(WHY),
    at(WHY, 'components/layouts/list-page.tsx'),
    at('/** Why: one line is enough. */\nexport function Badge() { return null }'),
    at('export function Clients() { return null }', 'features/clients/clients.tsx'),
    at('export const tone = 1', 'components/tones.ts'),
  ],
  invalid: [
    { ...at('export function SessionsMap() { return null }'), errors: [{ messageId: 'why', data: { context: 'sales' } }] },
    { ...at('/** The map of the sessions. */\nexport function SessionsMap() { return null }'), errors: [{ messageId: 'why' }] },
    { ...at('// Why: a line comment is not its doc\nexport function SessionsMap() { return null }'), errors: [{ messageId: 'why' }] },
    { ...at('/** Why: */\nexport function ListPage() { return null }', 'components/layouts/list-page.tsx'), errors: [{ messageId: 'why' }] },
  ],
})
