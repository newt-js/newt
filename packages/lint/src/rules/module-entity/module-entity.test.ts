import { MODULE }       from '../../testing/testing'
import { asRule }       from '../../testing/testing'
import { tester }       from '../../testing/testing'
import { moduleEntity } from './module-entity'

const ENTITY = "import { Entity } from '@newt-js/core'\n"

tester.run('module-entity', asRule(moduleEntity), {
  valid: [
    { code: `${ENTITY}export class PriceChange extends Entity<S> {}`, filename: `${MODULE}/price-change.ts` },
    { code: `${ENTITY}export class PriceRounding {}\nexport class Rounder extends Base {}`, filename: `${MODULE}/services/price-rounding.ts` },
    { code: `${ENTITY}export class Line extends Entity<S> {}`, filename: '/repo/src/shared/line.ts' },
  ],
  invalid: [
    { code: `${ENTITY}export class PriceChange extends Entity<S> {}\nexport class Line extends Entity<L> {}`, filename: `${MODULE}/price-change.ts`, errors: [{ messageId: 'second', data: { name: 'Line', module: 'price-change' } }] },
    { code: `${ENTITY}export class Line extends Entity<L> {}`, filename: `${MODULE}/services/line.ts`, errors: [{ messageId: 'elsewhere', data: { name: 'Line', module: 'price-change' } }] },
    { code: "import { Entity as Root } from '@newt-js/core'\nexport class Line extends Root<L> {}", filename: `${MODULE}/price-change.repository.ts`, errors: [{ messageId: 'elsewhere' }] },
    { code: "import * as core from '@newt-js/core'\nexport const Line = class extends core.Entity<L> {}", filename: `${MODULE}/value-objects/line.ts`, errors: [{ messageId: 'elsewhere', data: { name: 'an anonymous class', module: 'price-change' } }] },
  ],
})
