import { asRule }    from '../../testing/testing'
import { tester }    from '../../testing/testing'
import { appStyles } from './app-styles'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, filename = `${APP}/app.tsx`) => ({ code, filename, options })

tester.run('app-styles', asRule(appStyles), {
  valid: [
    at('const page = <Button onClick={send}>Send</Button>'),
    at("import { Button } from '@newt-js/react/button'"),
    at('const form = <form onSubmit={send}><Input name="email" /></form>'),
    at("const own = <div className='flex gap-2'>{children}</div>", `${APP}/components/toolbar.tsx`),
    at("import { cn } from 'cn'", `${APP}/components/toolbar.tsx`),
    at("import { Slot } from 'radix-ui'", `${APP}/components/toolbar.tsx`),
    at("const server = <div className='x' />", `${FOLDER}/sales/emails/welcome.tsx`),
  ],
  invalid: [
    { ...at("const page = <Button className='w-full'>Send</Button>"), errors: [{ messageId: 'style', data: { context: 'sales' } }] },
    { ...at("const page = <div class='w-full' />"), errors: [{ messageId: 'style' }] },
    { ...at('const page = <div style={{ color: "red" }} />'), errors: [{ messageId: 'style' }] },
    { ...at("const page = <Button {...{ className: 'w-full' }}>Send</Button>"), errors: [{ messageId: 'style' }] },
    { ...at("const page = <Button {...{ 'style': {} }}>Send</Button>"), errors: [{ messageId: 'style' }] },
    { ...at('const page = <style>{css}</style>'), errors: [{ messageId: 'style' }] },
    { ...at("import { cn } from 'cn'"), errors: [{ messageId: 'tools', data: { context: 'sales', path: 'cn' } }] },
    { ...at("import { cva } from 'class-variance-authority'"), errors: [{ messageId: 'tools' }] },
    { ...at("import { twMerge } from 'tailwind-merge'"), errors: [{ messageId: 'tools' }] },
    { ...at("import { Dialog } from 'radix-ui'"), errors: [{ messageId: 'primitive', data: { context: 'sales', path: 'radix-ui' } }] },
    { ...at("import * as Dialog from '@radix-ui/react-dialog'"), errors: [{ messageId: 'primitive' }] },
    { ...at("const page = <Button className='w-full'>Send</Button>", `${APP}/pages/orders.tsx`), errors: [{ messageId: 'style' }] },
  ],
})
