import { asRule }   from '../../testing/testing'
import { tester }   from '../../testing/testing'
import { appFiles } from './app-files'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (inside: string, code = '') => ({ code, filename: `${APP}/${inside}`, options })

tester.run('app-files', asRule(appFiles), {
  valid: [
    at('main.tsx'),
    at('app.tsx'),
    at('app.routes.tsx'),
    at('base.ts'),
    at('components/sessions-map.tsx'),
    at('components/layouts/list-page.tsx'),
    at('guards/session-guard.tsx'),
    at('services/theme/theme.service.ts'),
    at('pages/shell/shell.tsx'),
    at('pages/shell/shell-nav.tsx'),
    at('features/clients/clients.tsx'),
    at('features/clients/clients.service.ts'),
    at('features/clients/clients.api.ts', "import { Requester } from '@newt-js/client'"),
    at('features/clients/clients-list.tsx'),
    at('features/clients/clients-list-row/clients-list-row.tsx'),
    at('features/clients/clients-list-row/clients-list-row-menu.tsx'),
    at('features/clients/clients.service.ts', "import type { Requester } from '@newt-js/client'"),
    at('features/clients/clients.service.ts', "import { type Requester, Store } from '@newt-js/client'"),
    { code: '', filename: `${FOLDER}/sales/modules/order/order.ts`, options },
  ],
  invalid: [
    { ...at('helpers.ts'), errors: [{ messageId: 'root', data: { inside: 'helpers.ts', context: 'sales' } }] },
    { ...at('utils/format.ts'), errors: [{ messageId: 'root' }] },
    { ...at('layouts/list-page.tsx'), errors: [{ messageId: 'root' }] },
    { ...at('features/clients.tsx'), errors: [{ messageId: 'loose', data: { inside: 'features/clients.tsx', context: 'sales', top: 'features' } }] },
    { ...at('services/theme.service.ts'), errors: [{ messageId: 'loose' }] },
    { ...at('features/clients/list.tsx'), errors: [{ messageId: 'prefix', data: { name: 'list', folder: 'clients' } }] },
    { ...at('features/clients/detail/clients-detail.tsx'), errors: [{ messageId: 'prefix', data: { name: 'detail', folder: 'clients' } }, { messageId: 'prefix' }] },
    { ...at('features/clients/clients-detail/secrets.tsx'), errors: [{ messageId: 'prefix', data: { name: 'secrets', folder: 'clients-detail' } }] },
    { ...at('pages/home/home.service.ts'), errors: [{ messageId: 'pages' }] },
    { ...at('pages/home/home.api.ts'), errors: [{ messageId: 'pages' }] },
    { ...at('features/clients/clients.service.ts', "import { Requester } from '@newt-js/client'"), errors: [{ messageId: 'requester' }] },
    { ...at('features/clients/clients-list.tsx', "import { Store, Requester } from '@newt-js/client'"), errors: [{ messageId: 'requester' }] },
  ],
})
