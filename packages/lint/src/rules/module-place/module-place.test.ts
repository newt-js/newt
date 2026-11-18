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

/** A context sales whose feature orders has a module order: its folder, with its order.module.ts. */
const CONTEXTS = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-place-'))), 'src/contexts')
mkdirSync(join(CONTEXTS, 'sales/features/orders/order'), { recursive: true })
writeFileSync(join(CONTEXTS, 'sales/features/orders/order/order.module.ts'), '')

const options = [{ folder: CONTEXTS }]
const at = (file: string) => ({ code: 'export const x = 1', filename: `${CONTEXTS}/${file}`, options })

tester.run('module-place', asRule(modulePlace), {
  valid: [
    at('sales/features/orders/order/order.module.ts'),
    at('sales/features/orders/order/value-objects/order-id.ts'),
    at('sales/features/orders/orders.feature.ts'),
    at('sales/sales.context.ts'),
    at('sales/sales-features.ts'),
    at('sales/app/app.tsx'),
    at('contexts.ts'),
    { code: 'export const x = 1', filename: '/repo/src/modules/order/order.module.ts', options },
  ],
  invalid: [
    { ...at('sales/modules/order/order.module.ts'), errors: [{ messageId: 'outside', data: { context: 'sales', module: 'order' } }] },
    { ...at('sales/feature/orders/order/order.ts'), errors: [{ messageId: 'singular', data: { context: 'sales', found: 'feature', plural: 'features' } }] },
    { ...at('sales/features/orders/modules/order/order.ts'), errors: [{ messageId: 'inFeature', data: { context: 'sales', feature: 'orders', found: 'modules', module: 'order' } }] },
    { ...at('sales/features/orders/module/order/order.ts'), errors: [{ messageId: 'inFeature', data: { context: 'sales', feature: 'orders', found: 'module', module: 'order' } }] },
    { ...at('sales/features/orders/shared/money.ts'), errors: [{ messageId: 'notModule', data: { context: 'sales', feature: 'orders', folder: 'shared' } }] },
    { ...at('sales/features/orders/__tests__/orders.test.ts'), errors: [{ messageId: 'notModule', data: { context: 'sales', feature: 'orders', folder: '__tests__' } }] },
  ],
})
