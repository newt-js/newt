import { default as parser } from '@typescript-eslint/parser'
import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { it }                from 'bun:test'
import { RuleTester }        from 'eslint'
// --------------------------------------------------------
import { layerOf }           from './layers'
import { layers }            from './layers'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const tester = new RuleTester({ languageOptions: { parser } })
const core = '/repo/packages/core/src'

describe('layerOf', () => {
  it('says the layer of a file of the core, and none for one outside it or at its root', () => {
    expect(layerOf(`${core}/domain/clock/now/now.ts`)).toBe('domain')
    expect(layerOf(`${core}/adapters/http/router.ts`)).toBe('adapters/http')
    expect(layerOf(`${core}/adapters/database/postgres/table/table.ts`)).toBe('adapters/database/postgres')
    expect(layerOf(`${core}/adapters/database/index.ts`)).toBe('adapters/database')
    expect(layerOf(`${core}/index.ts`)).toBeNull()
    expect(layerOf('/repo/tools/lint/layers.ts')).toBeNull()
  })
})

tester.run('layers', layers, {
  valid: [
    { filename: `${core}/domain/a/a.ts`, code: `import { b } from '../b/b'` },
    { filename: `${core}/domain/a/a.ts`, code: `import { z } from 'zod'` },
    { filename: `${core}/application/a/a.ts`, code: `import { b } from '../../domain/b/b'` },
    { filename: `${core}/adapters/http/a.ts`, code: `import { b } from '../../application/b/b'` },
    { filename: `${core}/adapters/database/mysql/a/a.ts`, code: `import { b } from '../../sql/b/b'` },
    { filename: `${core}/adapters/database/memory/a/a.ts`, code: `import { b } from '../b/b'` },
    { filename: `${core}/application/a/a.test.ts`, code: `import { b } from '../../adapters/cluster/memory/b/b'` },
    { filename: `${core}/domain/a/a.test.ts`, code: `import { b } from '../../adapters/database/memory/b/b'` },
    { filename: `${core}/adapters/http/a/a.test.ts`, code: `import { b } from '../../cluster/memory/b/b'` },
    { filename: `${core}/adapters/http/a/a.test.ts`, code: `import { b } from '../../files/local/b/b'` },
    { filename: `${core}/index.ts`, code: `export * from './domain'` },
    { filename: '/repo/tools/x.ts', code: `import { b } from '../packages/core/src/application/b'` },
  ],
  invalid: [
    { filename: `${core}/domain/a/a.ts`, code: `import { b } from '../../application/b/b'`, errors: [{ messageId: 'outward', data: { from: 'domain', to: 'application' } }] },
    { filename: `${core}/application/a/a.ts`, code: `export * from '../../adapters/http/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/adapters/http/a.ts`, code: `import { b } from '../database/postgres/b/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/adapters/database/sqlite/a/a.ts`, code: `import { b } from '../../postgres/b/b'`, errors: [{ messageId: 'outward', data: { from: 'adapters/database/sqlite', to: 'adapters/database/postgres' } }] },
    { filename: `${core}/adapters/database/memory/a/a.ts`, code: `import { b } from '../../sql/b/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/application/a/a.ts`, code: `import { b } from '../../adapters/cluster/memory/b/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/adapters/files/local/a/a.test.ts`, code: `import { b } from '../../../database/postgres/b/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/adapters/http/a/a.ts`, code: `import { b } from '../../files/local/b/b'`, errors: [{ messageId: 'outward' }] },
    { filename: `${core}/domain/a/a.ts`, code: `export { b } from '../../testing/b'`, errors: [{ messageId: 'outward' }] },
  ],
})
