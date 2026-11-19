import { TEMPLATE }    from '../../testing/testing'
import { asRule }      from '../../testing/testing'
import { tester }      from '../../testing/testing'
import { moduleNames } from './module-names'

const MODULE_TS = `${TEMPLATE}/template.module.ts`
const CLASS = (body: string) => `import { Module } from '@newt-js/core'\nclass Template_Module extends Module {\n${body}\n}`

tester.run('module-names', asRule(moduleNames), {
  valid: [
    { code: CLASS("constructor(base) { super('template', base.useCaseRunner) }"), filename: MODULE_TS },
    { code: "import { defineEvent } from '@newt-js/core'\nexport const Template_Created = defineEvent('template.created', schema)", filename: `${TEMPLATE}/events/template-created.ts` },
    { code: "this.nightly = base.schedules.define('template.nightly', '0 3 * * *')", filename: MODULE_TS },
    { code: "const limit = base.rateLimits.define('template.send', rule)", filename: MODULE_TS },
    // A name not written as a literal is not judged, nor a class that is no module.
    { code: CLASS('constructor(base, name) { super(name, base.useCaseRunner) }'), filename: MODULE_TS },
    { code: "class Other extends Base { constructor() { super('anything') } }", filename: MODULE_TS },
    // A test names throwaway events as it likes.
    { code: "import { defineEvent } from '@newt-js/core'\nconst Other = defineEvent('other.happened', schema)", filename: `${TEMPLATE}/template.module.test.ts` },
    // A folder in kebab-case is named in camelCase.
    { code: CLASS("constructor(base) { super('orderLine', base.useCaseRunner) }"), filename: '/repo/src/contexts/shop/modules/order-line/order-line.module.ts' },
  ],
  invalid: [
    { code: CLASS("constructor(base) { super('campaigns[template]', base.useCaseRunner) }"), filename: MODULE_TS, errors: [{ messageId: 'module', data: { expected: 'template', found: 'campaigns[template]' } }] },
    { code: CLASS("constructor(base) { super('mailTemplate', base.useCaseRunner) }"), filename: MODULE_TS, errors: [{ messageId: 'module' }] },
    { code: "import { defineEvent } from '@newt-js/core'\nexport const Template_Created = defineEvent('campaigns[template].created', schema)", filename: `${TEMPLATE}/events/template-created.ts`, errors: [{ messageId: 'name', data: { found: 'campaigns[template].created', expected: 'template' } }] },
    { code: "this.nightly = base.schedules.define('tag.nightly', '0 3 * * *')", filename: MODULE_TS, errors: [{ messageId: 'name' }] },
    { code: "const limit = base.rateLimits.define('send', rule)", filename: MODULE_TS, errors: [{ messageId: 'name' }] },
  ],
})
