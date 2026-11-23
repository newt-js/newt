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
    at('main.tsx', "import { Requester } from '@newt-js/client'"),
    at('app.tsx'),
    at('app.routes.tsx'),
    at('base.ts'),
    at('components/sessions-map.tsx'),
    at('components/layouts/list-page.tsx'),
    at('guards/session-guard.tsx'),
    at('services/theme/theme.service.ts'),
    at('pages/shell/shell.tsx'),
    at('pages/shell/shell-nav/shell-nav.tsx'),
    at('features/clients/clients.routes.tsx'),
    at('features/clients/clients.tsx'),
    at('features/clients/clients.service.ts'),
    at('features/clients/clients.api.ts', "import { Requester } from '@newt-js/client'"),
    at('features/clients/clients-list/clients-list.tsx'),
    at('features/clients/clients-list/clients-list-row/clients-list-row.tsx'),
    at('features/clients/clients-list/clients-list-row/clients-list-row-menu/clients-list-row-menu.tsx'),
    at('features/clients/clients-list/clients-list-row/clients-list-row.helpers.ts'),
    at('features/clients/clients.service.ts', "import type { Requester } from '@newt-js/client'"),
    at('features/clients/clients.service.ts', "import { type Requester, Store } from '@newt-js/client'"),
    at('features/clients/clients-list/clients-list.tsx', "import { ClientsService } from '../clients.service'"),
    at('features/clients/clients.tsx', "import { ListPage } from '../../components/layouts/list-page'"),
    at('app.routes.tsx', "const Clients = lazy(() => import('./features/clients/clients').then(({ Clients }) => ({ default: Clients })))"),
    at('pages/shell/shell.tsx', "import type { ClientDTO } from '../../features/clients/clients.state'"),
    { code: '', filename: `${FOLDER}/sales/modules/order/order.ts`, options },
  ],
  invalid: [
    { ...at('helpers.ts'), errors: [{ messageId: 'root', data: { inside: 'helpers.ts', context: 'sales' } }] },
    { ...at('utils/format.ts'), errors: [{ messageId: 'root' }] },
    { ...at('layouts/list-page.tsx'), errors: [{ messageId: 'root' }] },
    { ...at('features/clients.tsx'), errors: [{ messageId: 'loose', data: { inside: 'features/clients.tsx', context: 'sales', top: 'features' } }] },
    { ...at('services/theme.service.ts'), errors: [{ messageId: 'loose' }] },
    { ...at('features/clients/list.tsx'), errors: [{ messageId: 'prefix', data: { name: 'list', folder: 'clients' } }, { messageId: 'own' }] },
    { ...at('features/clients/detail/clients-detail.tsx'), errors: [{ messageId: 'prefix', data: { name: 'detail', folder: 'clients' } }, { messageId: 'prefix' }, { messageId: 'own' }] },
    { ...at('features/clients/clients-detail/secrets.tsx'), errors: [{ messageId: 'prefix', data: { name: 'secrets', folder: 'clients-detail' } }, { messageId: 'own' }] },
    { ...at('features/clients/clients-list.tsx'), errors: [{ messageId: 'own', data: { inside: 'features/clients/clients-list.tsx', folder: 'clients', name: 'clients-list' } }] },
    { ...at('features/clients/clients-list/clients-list-row.tsx'), errors: [{ messageId: 'own' }] },
    { ...at('pages/shell/shell-nav.tsx'), errors: [{ messageId: 'own' }] },
    { ...at('pages/home/home.service.ts'), errors: [{ messageId: 'pages' }] },
    { ...at('pages/home/home.api.ts'), errors: [{ messageId: 'pages' }] },
    { ...at('features/clients/clients.service.ts', "import { Requester } from '@newt-js/client'"), errors: [{ messageId: 'requester' }] },
    { ...at('features/clients/clients-list/clients-list.tsx', "import { Store, Requester } from '@newt-js/client'"), errors: [{ messageId: 'requester' }] },
    { ...at('app.tsx', "import { Requester } from '@newt-js/client'"), errors: [{ messageId: 'requester' }] },
    { ...at('app.routes.tsx', "import { Clients } from './features/clients/clients'"), errors: [{ messageId: 'lazy', data: { inside: 'app.routes.tsx', other: 'clients' } }] },
    { ...at('pages/shell/shell.tsx', "import { ClientsService } from '../../features/clients/clients.service'"), errors: [{ messageId: 'lazy' }] },
    { ...at('features/clients/clients.tsx', "import { Invoices } from '../invoices/invoices'"), errors: [{ messageId: 'feature', data: { inside: 'features/clients/clients.tsx', other: 'invoices' } }] },
    { ...at('features/clients/clients-list/clients-list.tsx', "import { InvoicesService } from '../../invoices/invoices.service'"), errors: [{ messageId: 'feature' }] },
    { ...at('features/main.tsx', "import { Requester } from '@newt-js/client'"), errors: [{ messageId: 'loose' }, { messageId: 'requester' }] },
  ],
})
