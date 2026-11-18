import { asRule }      from '../../testing/testing'
import { tester }      from '../../testing/testing'
import { modulePlace } from './module-place'

const CONTEXTS = '/repo/src/contexts'
const options = [{ folder: CONTEXTS }]
const at = (file: string) => ({ code: 'export const x = 1', filename: `${CONTEXTS}/${file}`, options })

tester.run('module-place', asRule(modulePlace), {
  valid: [
    at('sales/features/orders/modules/order/order.module.ts'),
    at('sales/features/orders/orders.feature.ts'),
    at('sales/sales.context.ts'),
    at('sales/sales-features.ts'),
    at('sales/app/app.tsx'),
    at('contexts.ts'),
    { code: 'export const x = 1', filename: '/repo/src/modules/order/order.module.ts', options },
  ],
  invalid: [
    {
      ...at('sales/modules/order/order.module.ts'),
      errors: [{ messageId: 'outside', data: { context: 'sales', module: 'order' } }],
    },
    { ...at('sales/feature/orders/modules/order/order.ts'), errors: [{ messageId: 'singular', data: { context: 'sales', found: 'feature', plural: 'features' } }] },
    { ...at('sales/features/orders/module/order/order.ts'), errors: [{ messageId: 'singular', data: { context: 'sales', found: 'module', plural: 'modules' } }] },
  ],
})
