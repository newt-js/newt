import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { it }            from 'bun:test'
// --------------------------------------------------------
import { MODULE }        from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { diagnosticsOf } from '../../testing/testing'
import { programOf }     from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { typedTester }   from '../../testing/testing'
import { moduleEntity }  from './module-entity'

const ENTITY = "import { Entity } from '@newt-js/core'\n"

tester.run('module-entity', asRule(moduleEntity), {
  valid: [
    { code: `${ENTITY}export class PriceChange extends Entity<S> {}`, filename: `${MODULE}/price-change.ts` },
    { code: `${ENTITY}export class PriceRounding {}\nexport class Rounder extends Base {}`, filename: `${MODULE}/services/price-rounding.ts` },
    { code: `${ENTITY}export class Line extends Entity<S> {}`, filename: '/repo/src/shared/line.ts' },
    { code: `${ENTITY}class Probe extends Entity<S> {}`, filename: `${MODULE}/price-change.module.test.ts` },
  ],
  invalid: [
    { code: `${ENTITY}export class PriceChange extends Entity<S> {}\nexport class Line extends Entity<L> {}`, filename: `${MODULE}/price-change.ts`, errors: [{ messageId: 'second', data: { name: 'Line', module: 'price-change' } }] },
    { code: `${ENTITY}export class Line extends Entity<L> {}`, filename: `${MODULE}/services/line.ts`, errors: [{ messageId: 'elsewhere', data: { name: 'Line', module: 'price-change' } }] },
    { code: "import { Entity as Root } from '@newt-js/core'\nexport class Line extends Root<L> {}", filename: `${MODULE}/price-change.repository.ts`, errors: [{ messageId: 'elsewhere' }] },
    { code: "import * as core from '@newt-js/core'\nexport const Line = class extends core.Entity<L> {}", filename: `${MODULE}/value-objects/line.ts`, errors: [{ messageId: 'elsewhere', data: { name: 'an anonymous class', module: 'price-change' } }] },
  ],
})

const CORE = '/repo/node_modules/@newt-js/core/index.ts'
const SHARED = '/repo/src/shared/root.ts'
const program = programOf({
  [CORE]: 'export class Entity<S> {\n  constructor(readonly props: S) {}\n}\n',
  [SHARED]: "import { Entity } from '../../node_modules/@newt-js/core/index'\nexport class Root<S> extends Entity<S> {}\nexport class Plain {}\n",
  [`${MODULE}/price-change.ts`]: "import { Root } from '../../../../../../shared/root'\nexport class PriceChange extends Root<{ a: number }> {}\n",
  [`${MODULE}/services/line.ts`]: "import { Plain, Root } from '../../../../../../../shared/root'\nexport class Line extends Root<{ b: number }> {}\nexport class Rounder extends Plain {}\n",
})

describe('module-entity, with types', () => {
  it('types every file it is given', () => {
    expect(diagnosticsOf(program)).toEqual([])
  })

  typedTester(program).run('module-entity', asRule(moduleEntity), {
    valid: [{ code: program.getSourceFile(`${MODULE}/price-change.ts`)!.text, filename: `${MODULE}/price-change.ts` }],
    invalid: [
      { code: program.getSourceFile(`${MODULE}/services/line.ts`)!.text, filename: `${MODULE}/services/line.ts`, errors: [{ messageId: 'elsewhere', data: { name: 'Line', module: 'price-change' } }] },
    ],
  })
})
