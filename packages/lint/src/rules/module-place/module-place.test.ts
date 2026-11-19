import { mkdirSync }     from 'node:fs'
import { mkdtempSync }   from 'node:fs'
import { realpathSync }  from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { modulePlace }   from './module-place'

/** A context sales with a module order: its folder, with its order.module.ts. */
const CONTEXTS = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-place-'))), 'src/contexts')
mkdirSync(join(CONTEXTS, 'sales/modules/order'), { recursive: true })
writeFileSync(join(CONTEXTS, 'sales/modules/order/order.module.ts'), '')

const options = [{ folder: CONTEXTS }]
const at = (file: string) => ({ code: 'export const x = 1', filename: `${CONTEXTS}/${file}`, options })

tester.run('module-place', asRule(modulePlace), {
  valid: [
    at('sales/modules/order/order.module.ts'),
    at('sales/modules/order/value-objects/order-id.ts'),
    at('sales/modules/order/__tests__/order.test.ts'),
    at('sales/sales.context.ts'),
    at('sales/app/app.tsx'),
    at('contexts.ts'),
    { code: 'export const x = 1', filename: '/repo/src/modules/order/order.module.ts', options },
  ],
  invalid: [
    { ...at('sales/features/orders/order/order.ts'), errors: [{ messageId: 'feature', data: { context: 'sales', feature: 'orders', module: 'order' } }] },
    { ...at('sales/module/order/order.ts'), errors: [{ messageId: 'singular', data: { context: 'sales' } }] },
    { ...at('sales/modules/shared/money.ts'), errors: [{ messageId: 'notModule', data: { context: 'sales', folder: 'shared' } }] },
  ],
})
