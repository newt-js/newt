import { asRule }     from '../../testing/testing'
import { tester }     from '../../testing/testing'
import { appImports } from './app-imports'

const FOLDER = '/repo/src/contexts'

const APP = `${FOLDER}/sales/app`

const options = [{ folder: FOLDER }]

const at = (code: string, filename = `${APP}/main.tsx`) => ({ code, filename, options })

tester.run('app-imports', asRule(appImports), {
  valid: [
    at("import { App } from './app'"),
    at("import { list } from '../pages/list'", `${APP}/components/table.tsx`),
    at("import { createRoot } from 'react-dom/client'"),
    at("import type { OrderDTO } from '../modules/order/order.schema'"),
    at("import { type OrderDTO, type OrderSortDTO } from '../modules/order/order.schema'"),
    at("export type { OrderDTO } from '../modules/order/order.schema'"),
    at("export type * from '../modules/order/order.schema'"),
    at("export { type OrderDTO } from '../modules/order/order.schema'"),
    at("type Order = import('../modules/order/order.schema').OrderDTO"),
    at("import type { Page } from '@newt-js/core'"),
    at("import type { BunFile } from 'bun'"),
    at("import { Order_Module } from './modules/order/order.module'", `${FOLDER}/sales/sales-modules.ts`),
  ],
  invalid: [
    { ...at("import { OrderSchema } from '../modules/order/order.schema'"), errors: [{ messageId: 'schema', data: { path: '../modules/order/order.schema', context: 'sales' } }] },
    { ...at("import { Order_Module } from '../modules/order/order.module'"), errors: [{ messageId: 'outside' }] },
    { ...at("import type { Order_Repository } from '../modules/order/order.repository'"), errors: [{ messageId: 'outside' }] },
    { ...at("import type { UserDTO } from '../../auth/modules/user/user.schema'"), errors: [{ messageId: 'outside' }] },
    { ...at("import { requiredEnv } from '../../../env'"), errors: [{ messageId: 'outside' }] },
    { ...at("import { Email } from '@newt-js/core'"), errors: [{ messageId: 'server', data: { path: '@newt-js/core', context: 'sales' } }] },
    { ...at("const lazy = import('@newt-js/core/http')"), errors: [{ messageId: 'server' }] },
    { ...at("import { Database } from 'bun:sqlite'"), errors: [{ messageId: 'runtime', data: { path: 'bun:sqlite', context: 'sales' } }] },
    { ...at("import { readFile } from 'node:fs/promises'"), errors: [{ messageId: 'runtime' }] },
    { ...at("import { readFileSync } from 'fs'"), errors: [{ messageId: 'runtime' }] },
    { ...at("import { join } from 'path'"), errors: [{ messageId: 'runtime' }] },
    { ...at("import { $ } from 'bun'"), errors: [{ messageId: 'runtime' }] },
    { ...at("export * from '../modules/order/order.schema'"), errors: [{ messageId: 'schema' }] },
    { ...at("import { requiredEnv } from '/repo/src/env'"), errors: [{ messageId: 'outside' }] },
  ],
})
