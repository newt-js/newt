import { MODULE }        from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { schemaImports } from './schema-imports'

const SCHEMA = `${MODULE}/price-change.schema.ts`

tester.run('schema-imports', asRule(schemaImports), {
  valid: [
    { code: "import { z } from 'zod'", filename: SCHEMA },
    { code: "import { defineFilter } from '@newt-js/core'", filename: SCHEMA },
    { code: "import type { Page } from '@newt-js/core'", filename: SCHEMA },
    { code: "import { PriceChangeId } from './value-objects/price-change-id'", filename: SCHEMA },
    { code: "import type { ProductDTO } from '../product/product.schema'", filename: SCHEMA },
    { code: "import type { UserDTO } from '../../../../../auth/features/users/user/user.schema.ts'", filename: SCHEMA },
    // Another feature's DTO types, through its entry point: what an entity of this module references.
    { code: "import type { CustomerDTO } from '../../customers'", filename: SCHEMA },
    { code: "import type { CustomerDTO } from '../../customers/index'", filename: SCHEMA },
    { code: "import { type CustomerDTO, type CustomerId } from '../../customers/index.ts'", filename: SCHEMA },
    // The rest of a module is not its contract: it may.
    { code: "import { HttpRouter } from '@newt-js/core/http'", filename: `${MODULE}/price-change.routes.ts` },
    { code: "import { PriceChange } from './price-change'", filename: `${MODULE}/price-change.module.ts` },
  ],
  invalid: [
    { code: "import { HttpRouter } from '@newt-js/core/http'", filename: SCHEMA, errors: [{ messageId: 'package' }] },
    { code: "export * from '@newt-js/core/database/postgres'", filename: SCHEMA, errors: [{ messageId: 'package' }] },
    { code: "import { slugify } from 'slugify'", filename: SCHEMA, errors: [{ messageId: 'package' }] },
    { code: "import { PriceChange } from './price-change'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import { PriceChange_Repository } from './price-change.repository'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import { PriceNotFound } from './errors/price-not-found'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import type { Product_Module } from '../product/product.module'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import { ProductId } from '../product/value-objects/product-id'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import { money } from '../../../../../../shared/money'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    // Of another feature's entry point, types alone; and of its own feature's, nothing.
    { code: "import { Customers_Feature } from '../../customers'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import type { PricesDTO } from '../index'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "import type { Customer_Module } from '../../customers/customer/customer.module'", filename: SCHEMA, errors: [{ messageId: 'file' }] },
    { code: "const core = await import('@newt-js/core/http')", filename: '/repo/examples/shop/features/orders/order/order.schema.ts', errors: [{ messageId: 'package' }] },
  ],
})
