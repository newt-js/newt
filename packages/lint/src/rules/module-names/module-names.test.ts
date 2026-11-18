import { TEMPLATE }    from '../../testing/testing'
import { asRule }      from '../../testing/testing'
import { tester }      from '../../testing/testing'
import { moduleNames } from './module-names'

const MODULE_TS = `${TEMPLATE}/template.module.ts`
/** The module in its feature's folder, without `modules/`. */
const IN_FEATURE = `${TEMPLATE.replace('/modules/', '/')}/template.module.ts`
const CLASS = (body: string) => `import { Module } from '@newt-js/core'\nclass Template_Module extends Module {\n${body}\n}`

tester.run('module-names', asRule(moduleNames), {
  valid: [
    { code: CLASS("constructor(base) { super('campaigns[template]', base.useCaseRunner) }"), filename: MODULE_TS },
    { code: CLASS("constructor(base) { super('campaigns[template]', base.useCaseRunner) }"), filename: IN_FEATURE },
    { code: CLASS("readonly exposes = { useCases: ['get'], events: ['created'] } as const"), filename: MODULE_TS },
    { code: CLASS("readonly exposes = { useCases: ['get'] } as const satisfies Exposes"), filename: MODULE_TS },
    { code: CLASS('readonly exposes = EXPOSES'), filename: MODULE_TS },
    { code: "import { defineEvent } from '@newt-js/core'\nexport const Template_Created = defineEvent('campaigns[template].created', schema)", filename: `${TEMPLATE}/events/template-created.ts` },
    { code: "this.nightly = base.schedules.define('campaigns[template].nightly', '0 3 * * *')", filename: MODULE_TS },
    { code: "const limit = base.rateLimits.define('campaigns[template].send', rule)", filename: MODULE_TS },
    // A name not written as a literal is not judged, nor a class that is no module.
    { code: CLASS('constructor(base, name) { super(name, base.useCaseRunner) }'), filename: MODULE_TS },
    { code: "class Other extends Base { constructor() { super('anything') } }", filename: MODULE_TS },
    // A test names throwaway events as it likes.
    { code: "import { defineEvent } from '@newt-js/core'\nconst Other = defineEvent('other.happened', schema)", filename: `${TEMPLATE}/template.module.test.ts` },
    // A module of no feature, in the old layout, is no module: not judged.
    { code: CLASS("constructor(base) { super('priceChange', base.useCaseRunner) }"), filename: '/repo/src/contexts/ws/modules/price-change/price-change.module.ts' },
    // A feature in kebab-case is named in camelCase.
    { code: CLASS("constructor(base) { super('salesOrders[orderLine]', base.useCaseRunner) }"), filename: '/repo/src/contexts/shop/features/sales-orders/modules/order-line/order-line.module.ts' },
  ],
  invalid: [
    { code: CLASS("constructor(base) { super('template', base.useCaseRunner) }"), filename: IN_FEATURE, errors: [{ messageId: 'module', data: { expected: 'campaigns[template]', found: 'template' } }] },
    { code: CLASS("constructor(base) { super('template', base.useCaseRunner) }"), filename: MODULE_TS, errors: [{ messageId: 'module', data: { expected: 'campaigns[template]', found: 'template' } }] },
    { code: CLASS("constructor(base) { super('emails[template]', base.useCaseRunner) }"), filename: MODULE_TS, errors: [{ messageId: 'module' }] },
    { code: CLASS("readonly exposes = { useCases: ['get'] }"), filename: MODULE_TS, errors: [{ messageId: 'exposes' }] },
    { code: CLASS("readonly expose = { useCases: ['get'] } as const"), filename: MODULE_TS, errors: [{ messageId: 'expose' }] },
    { code: CLASS("readonly exposes = { usecases: ['get'], event: [] } as const"), filename: MODULE_TS, errors: [{ messageId: 'key', data: { key: 'usecases' } }, { messageId: 'key', data: { key: 'event' } }] },
    { code: "import { defineEvent } from '@newt-js/core'\nexport const Template_Created = defineEvent('template.created', schema)", filename: `${TEMPLATE}/events/template-created.ts`, errors: [{ messageId: 'name', data: { found: 'template.created', expected: 'campaigns[template]' } }] },
    { code: "this.nightly = base.schedules.define('campaigns[tag].nightly', '0 3 * * *')", filename: MODULE_TS, errors: [{ messageId: 'name' }] },
    { code: "const limit = base.rateLimits.define('send', rule)", filename: MODULE_TS, errors: [{ messageId: 'name' }] },
  ],
})
