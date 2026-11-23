import { MODULE }      from '../../testing/testing'
import { asRule }      from '../../testing/testing'
import { tester }      from '../../testing/testing'
import { moduleIndex } from './module-index'

const INDEX = `${MODULE}/index.ts`

tester.run('module-index', asRule(moduleIndex), {
  valid: [
    {
      code: [
        "export type { PriceChangeDTO, PriceChangeCreateDTO } from './price-change.schema'",
        "export type { PriceChange_Module } from './price-change.module'",
        "export type { PriceChange_Created } from './events/price-change-created'",
        "export { PriceChangeNotFound } from './errors/price-change-not-found'",
        "export { type PriceChangeDTO as Dto } from './price-change.schema'",
      ].join('\n'),
      filename: INDEX,
    },
    // Another file of the module, or an index.ts of no module, is not its index.
    { code: "export * from './price-change.schema'", filename: `${MODULE}/price-change.ts` },
    { code: "export * from './anything'", filename: '/repo/src/shared/index.ts' },
  ],
  invalid: [
    { code: "export * from './price-change.schema'", filename: INDEX, errors: [{ messageId: 'all' }] },
    { code: "export { PriceChangeDTO } from './price-change.schema'", filename: INDEX, errors: [{ messageId: 'type' }] },
    { code: "export { PriceChange_Module } from './price-change.module'", filename: INDEX, errors: [{ messageId: 'type' }] },
    { code: "export type { PriceChangeSchema, PriceChangeFilter } from './price-change.schema'", filename: INDEX, errors: [{ messageId: 'check' }, { messageId: 'check' }] },
    { code: "export type { PriceChange } from './price-change'", filename: INDEX, errors: [{ messageId: 'source' }] },
    { code: "export { PriceChangeId } from './value-objects/price-change-id'", filename: INDEX, errors: [{ messageId: 'source' }] },
    { code: "export type { ProductDTO } from '../product'", filename: INDEX, errors: [{ messageId: 'source' }] },
    { code: 'export const answer = 42', filename: INDEX, errors: [{ messageId: 'statement' }] },
    { code: "import { x } from './price-change.schema'\nexport { x }", filename: INDEX, errors: [{ messageId: 'statement' }, { messageId: 'statement' }] },
  ],
})
