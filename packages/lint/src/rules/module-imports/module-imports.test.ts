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
    { code: "import { Product_Created } from '../product/events/product-created.js'", filename: IN('price-change.workers.ts') },
    { code: "type M = import('../product/product.module').Product_Module", filename: IN('price-change.ts') },
    { code: "export * from './modules/product/product.module'", filename: '/repo/src/contexts/ws/index.ts' },
    { code: "export { ProductNotFound } from './product/errors/product-not-found'", filename: '/repo/src/contexts/ws/modules/index.ts' },
    { code: "import { Product_Repository } from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/ws.context.ts' },
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
    { code: "export * from './modules/product/product.repository'", filename: '/repo/src/contexts/ws/index.ts', errors: [{ messageId: 'barrel' }] },
    { code: "export { Product_Repository } from './product/product.repository'", filename: '/repo/src/contexts/ws/modules/index.ts', errors: [{ messageId: 'barrel' }] },
  ],
})
