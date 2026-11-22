import { asRule }  from '../../testing/testing'
import { tester }  from '../../testing/testing'
import { appHtml } from './app-html'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, inside = 'features/clients/clients.tsx') => ({ code, filename: `${APP}/${inside}`, options })

tester.run('app-html', asRule(appHtml), {
  valid: [
    at('const page = <Column as="section"><Heading>Clients</Heading><Text>None yet</Text></Column>'),
    at('const page = <><Button>Send</Button></>'),
    at('const page = <Clients.List />'),
    at('const own = <div>{children}</div>', 'components/sessions-map.tsx'),
    at('const own = <div>{children}</div>', 'components/layouts/list-page.tsx'),
    { code: 'const mail = <p>Hi</p>', filename: `${FOLDER}/sales/emails/welcome.tsx`, options },
  ],
  invalid: [
    { ...at('const page = <div>x</div>'), errors: [{ messageId: 'html', data: { element: 'div' } }] },
    { ...at('const page = <Column><h1>Clients</h1><p>None</p></Column>'), errors: [{ messageId: 'html', data: { element: 'h1' } }, { messageId: 'html', data: { element: 'p' } }] },
    { ...at('const page = <svg:rect />'), errors: [{ messageId: 'html', data: { element: 'svg:rect' } }] },
    { ...at('const shell = <main><Outlet /></main>', 'pages/shell/shell.tsx'), errors: [{ messageId: 'html' }] },
  ],
})
