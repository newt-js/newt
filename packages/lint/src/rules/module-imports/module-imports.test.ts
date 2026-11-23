import { mkdirSync }     from 'node:fs'
import { mkdtempSync }   from 'node:fs'
import { realpathSync }  from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir }        from 'node:os'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
// --------------------------------------------------------
import { MODULE }        from '../../testing/testing'
import { TEMPLATE }      from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { moduleImports } from './module-imports'

/** A context loop whose modules a and b use each other, and c, which uses a. */
const LOOP = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-module-uses-'))), 'src/contexts/loop/modules')
const FILES: Record<string, string> = {
  'a/a.deps.ts': "import type { B_Module } from '../b'\n",
  'b/b.deps.ts': "import type { A_Module } from '../a'\n",
  'c/c.deps.ts': "import type { A_Module } from '../a'\n",
}
for (const [file, code] of Object.entries(FILES)) {
  mkdirSync(dirname(join(LOOP, file)), { recursive: true })
  writeFileSync(join(LOOP, file), code)
}

const IN = (file: string) => `${MODULE}/${file}`

tester.run('module-imports', asRule(moduleImports), {
  valid: [
    // A module uses another of its context that does not use it back.
    { code: "import type { A_Module } from '../a'", filename: `${LOOP}/c/c.deps.ts` },
    { code: "import type { Product_Module } from '../product'", filename: IN('price-change.deps.ts') },
    { code: "import { ProductNotFound } from '../product'", filename: IN('price-change.module.ts') },
    { code: "import type { ProductDTO } from '../product'", filename: IN('price-change.ts') },
    { code: "import type { User_Module } from '../../../../../auth/modules/user'", filename: IN('price-change.deps.ts') },
    { code: "import { PriceChange } from './price-change'", filename: IN('price-change.repository.ts') },
    // Its own files, and another module of its context through its API.
    { code: "import { Template } from './template'", filename: `${TEMPLATE}/template.repository.ts` },
    { code: "import type { Tag_Module } from '../tag'", filename: `${TEMPLATE}/template.deps.ts` },
    { code: "export type { TemplateDTO } from './modules/template'", filename: '/repo/src/contexts/engagement/engagement.context.ts' },
    // Another module through its index.ts, by its folder or by the file.
    { code: "import type { ProductDTO } from '../product/index'", filename: IN('price-change.module.ts') },
    // Another context's module, even of the same name, is newt/published-modules' to judge.
    { code: "import { Tag } from '../../../contacts/modules/tag/tag'", filename: '/repo/src/contexts/engagement/modules/tag/tag.module.ts' },
    { code: "import type { Product_Module } from '../product'", filename: '/repo/examples/shop/modules/order/order.deps.ts' },
    { code: "import type { Product_Module } from '../product/index.js'", filename: IN('price-change.deps.ts') },
    { code: "import type { Product_Created } from '../product'", filename: IN('price-change.workers.ts') },
    { code: "import { type ProductDTO, type ProductFilterDTO } from '../product'", filename: IN('price-change.module.ts') },
    { code: "export type { ProductDTO } from '../product'", filename: IN('price-change.schema.ts') },
    { code: "import type P = require('../product')", filename: IN('price-change.deps.ts') },
    // A known error of another's is told apart as it is.
    { code: "if (error instanceof (await import('../product')).ProductNotFound) {}", filename: IN('price-change.module.ts') },
    // Its own schema, as a value: the module's own.
    { code: "import { PriceChangeSchema } from './price-change.schema'", filename: IN('price-change.module.ts') },
    { code: "type M = import('../product').Product_Module", filename: IN('price-change.ts') },
    { code: "export type * from './modules/product'", filename: '/repo/src/contexts/ws/ws.context.ts' },
    { code: "export type { ProductDTO } from './modules/product'", filename: '/repo/src/contexts/ws/ws.context.ts' },
    { code: "export { ProductNotFound } from './modules/product'", filename: '/repo/src/contexts/ws/ws.context.ts' },
    { code: "import { Product_Repository } from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/ws.context.ts' },
    // A context's composition builds its modules: it imports them as values.
    { code: "import { Product_Module } from './modules/product'", filename: '/repo/src/contexts/ws/ws.context.ts' },
  ],
  invalid: [
    // The modules of a context never use each other in a cycle.
    {
      code: "import type { B_Module } from '../b'",
      filename: `${LOOP}/a/a.deps.ts`,
      errors: [{ messageId: 'cycle', data: { cycle: 'a → b → a' } }],
    },
    { code: "import { Product_Repository } from '../product/product.repository'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    // A context's file re-exports only its modules' API.
    { code: "export * from './modules/template/template.repository'", filename: '/repo/src/contexts/engagement/engagement.context.ts', errors: [{ messageId: 'barrel' }] },
    { code: "import { Product } from '../product/product'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { Tag_Repository } from '../tag/tag.repository'", filename: `${TEMPLATE}/template.module.ts`, errors: [{ messageId: 'private' }] },
    // Another module's value object is its own: an id kept of its entity is one of this module's.
    { code: "import { ProductId } from '../product/value-objects/product-id'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    { code: "export * from '../product/infrastructure/product.table'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { Product_Repository } from '../product/product.repository'", filename: '/repo/examples/shop/modules/order/order.module.ts', errors: [{ messageId: 'private' }] },
    { code: "import { Product_Repository } from '../product/product.repository.js'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "const { Product_Repository } = await import('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "type R = import('../product/product.repository').Product_Repository", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "import R = require('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "const R = require('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    // Of another module, only its index.ts, by its folder: never its schema, module, events or errors themselves.
    { code: "import type { ProductDTO } from '../product/product.schema'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { ProductSchema } from '../product/product.schema'", filename: IN('price-change.schema.ts'), errors: [{ messageId: 'private' }] },
    { code: "import type { Product_Module } from '../product/product.module'", filename: IN('price-change.deps.ts'), errors: [{ messageId: 'private' }] },
    { code: "import type { Product_Created } from '../product/events/product-created'", filename: IN('price-change.workers.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { ProductNotFound } from '../product/errors/product-not-found'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "export { ProductNotFound } from './modules/product/errors/product-not-found'", filename: '/repo/src/contexts/ws/ws.context.ts', errors: [{ messageId: 'barrel' }] },
    { code: "import { productRules } from '../product/services/product-rules'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "export * from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/ws.context.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export * from './modules/product/product.schema'", filename: '/repo/src/contexts/ws/ws.context.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export { ProductSchema } from './modules/product/product.schema'", filename: '/repo/src/contexts/ws/ws.context.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export { Product_Repository } from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/ws.context.ts', errors: [{ messageId: 'barrel' }] },
  ],
})
