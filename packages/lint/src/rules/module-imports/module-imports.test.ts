import { MODULE }        from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { moduleImports } from './module-imports'

const IN = (file: string) => `${MODULE}/${file}`

tester.run('module-imports', asRule(moduleImports), {
  valid: [
    { code: "import type { Product_Module } from '../product/product.module'", filename: IN('price-change.deps.ts') },
    { code: "import { ProductNotFound } from '../product/errors/product-not-found'", filename: IN('price-change.module.ts') },
    { code: "import type { ProductDTO } from '../product/product.schema'", filename: IN('price-change.ts') },
    { code: "import type { User_Module } from '../../../auth/modules/user/user.module'", filename: IN('price-change.deps.ts') },
    { code: "import { PriceChange } from './price-change'", filename: IN('price-change.repository.ts') },
    { code: "import type { Product_Module } from '../product/product.module'", filename: '/repo/examples/shop/modules/order/order.deps.ts' },
    { code: "import type { Product_Module } from '../product/product.module.js'", filename: IN('price-change.deps.ts') },
    { code: "import type { Product_Created } from '../product/events/product-created.js'", filename: IN('price-change.workers.ts') },
    { code: "import { type ProductDTO, type ProductFilterDTO } from '../product/product.schema'", filename: IN('price-change.module.ts') },
    { code: "export type { ProductDTO } from '../product/product.schema'", filename: IN('price-change.schema.ts') },
    { code: "import type P = require('../product/product.module')", filename: IN('price-change.deps.ts') },
    // A known error of another's is told apart as it is.
    { code: "if (error instanceof (await import('../product/errors/product-not-found')).ProductNotFound) {}", filename: IN('price-change.module.ts') },
    // Its own schema, as a value: the module's own.
    { code: "import { PriceChangeSchema } from './price-change.schema'", filename: IN('price-change.module.ts') },
    { code: "type M = import('../product/product.module').Product_Module", filename: IN('price-change.ts') },
    { code: "export type * from './modules/product/product.module'", filename: '/repo/src/contexts/ws/index.ts' },
    { code: "export type { ProductDTO } from './product/product.schema'", filename: '/repo/src/contexts/ws/modules/index.ts' },
    { code: "export { ProductNotFound } from './product/errors/product-not-found'", filename: '/repo/src/contexts/ws/modules/index.ts' },
    { code: "import { Product_Repository } from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/ws.context.ts' },
    // A context's composition builds its modules: it imports them as values.
    { code: "import { Product_Module } from './modules/product/product.module'", filename: '/repo/src/contexts/ws/ws-modules.ts' },
  ],
  invalid: [
    { code: "import { Product_Repository } from '../product/product.repository'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { Product } from '../product/product'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    // Another module's value object is its own: an id kept of its entity is one of this module's.
    { code: "import { ProductId } from '../product/value-objects/product-id'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    { code: "export * from '../product/infrastructure/product.table'", filename: IN('price-change.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { Product_Repository } from '../product/product.repository'", filename: '/repo/examples/shop/modules/order/order.module.ts', errors: [{ messageId: 'private' }] },
    { code: "import { Product_Repository } from '../product/product.repository.js'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "import { Product_Repository } from '../product'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "const { Product_Repository } = await import('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "type R = import('../product/product.repository').Product_Repository", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "import R = require('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "const R = require('../product/product.repository')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    // Another module's API is its types: its schema as a value parses, builds and reads its data behind its use cases.
    { code: "import { ProductSchema } from '../product/product.schema'", filename: IN('price-change.schema.ts'), errors: [{ messageId: 'type' }] },
    { code: "import { ProductSchema, type ProductDTO } from '../product/product.schema'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'type' }] },
    { code: "export { ProductSchema } from '../product/product.schema'", filename: IN('price-change.schema.ts'), errors: [{ messageId: 'type' }] },
    { code: "export * from '../product/product.schema'", filename: IN('price-change.schema.ts'), errors: [{ messageId: 'type' }] },
    { code: "import '../product/product.schema'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'type' }] },
    { code: "const { ProductSchema } = await import('../product/product.schema')", filename: IN('price-change.module.ts'), errors: [{ messageId: 'type' }] },
    // Its module is given as a dependency, never built here.
    { code: "import { Product_Module } from '../product/product.module'", filename: IN('price-change.deps.ts'), errors: [{ messageId: 'type' }] },
    { code: "import P = require('../product/product.module')", filename: IN('price-change.deps.ts'), errors: [{ messageId: 'type' }] },
    // Its events are subscribed to through it, never emitted here.
    { code: "import { Product_Created } from '../product/events/product-created'", filename: IN('price-change.workers.ts'), errors: [{ messageId: 'type' }] },
    { code: "import { productRules } from '../product/services/product-rules'", filename: IN('price-change.module.ts'), errors: [{ messageId: 'private' }] },
    { code: "export * from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/index.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export * from './modules/product/product.schema'", filename: '/repo/src/contexts/ws/index.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export { ProductSchema } from './product/product.schema'", filename: '/repo/src/contexts/ws/modules/index.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export { Product_Repository } from './product/product.repository'", filename: '/repo/src/contexts/ws/modules/index.ts', errors: [{ messageId: 'barrel' }] },
  ],
})
