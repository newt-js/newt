import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import type { FileChange }  from '../../../commands/command'
import { defineCommand }    from '../../../commands/command'
import { checkGenerated }   from '../../../testing/check-generated/check-generated'
import { generate }         from '../../../testing/generate/generate'
import { templateVersions } from '../../template-versions/template-versions'
import { backendTemplate }  from './backend-template'

const STORES = { cluster: 'memory' as const, database: 'sqlite' as const, files: 'local' as const }

const VERSIONS = { newt: '1.2.3', zod: '4.0.0', eslint: '10.0.0', bunTypes: '1.4.0', react: '19.0.0', reactDom: '19.0.0', reactTypes: '19.0.0', reactDomTypes: '19.0.0', lintTypescript: 'npm:@typescript/typescript6@6.0.2', typescript: '7.0.2' }

const BACKEND_COMMAND = defineCommand({
  name: 'backend',
  summary: 'The backend template',
  run: async () => ({ changes: backendTemplate({ folder: '.', name: 'shop', port: 3000, stores: STORES, versions: await templateVersions() }) }),
})

const changeTo = (changes: FileChange[], path: string) => changes.find(change => change.path === path)

describe('backendTemplate', () => {
  test('a backend whose lint, types and tests pass, and which answers its health', async () => {
    expect(await checkGenerated(await generate(BACKEND_COMMAND))).toEqual([])
  }, 30_000)

  test('what it does to each file, in the folder given', () => {
    expect(backendTemplate({ folder: 'apps/shop', name: 'shop', port: 3000, stores: STORES, versions: VERSIONS }).map(change => `${change.action} ${change.path}`)).toEqual([
      'complete-json apps/shop/package.json',
      'create apps/shop/tsconfig.json',
      'create apps/shop/eslint.config.ts',
      'create apps/shop/AGENTS.md',
      'create apps/shop/src/backend.ts',
      'create apps/shop/src/stores.ts',
      'create apps/shop/src/env.ts',
      'create apps/shop/src/backend.test.ts',
      'create apps/shop/src/contexts.ts',
      'create apps/shop/src/index.ts',
      'create apps/shop/src/auth.ts',
      'complete-env apps/shop/.env',
      'complete-env apps/shop/.env.example',
      'ensure-lines apps/shop/.gitignore',
      'ensure-lines apps/shop/CLAUDE.md',
      'remove-unchanged apps/shop/index.ts',
      'remove-json-key apps/shop/package.json',
    ])
  })

  test('on the memory cluster, leaves the platform its own; on Valkey, gives it one', () => {
    const backendTs = (cluster: 'memory' | 'valkey') => {
      const change = changeTo(backendTemplate({ folder: '.', name: 'shop', port: 3000, stores: { ...STORES, cluster }, versions: VERSIONS }), 'src/backend.ts')
      return change?.action === 'create' ? change.content : ''
    }
    expect(backendTs('memory')).toContain('const platform = new Platform()\n')
    expect(backendTs('memory')).not.toContain('MemoryCluster')
    expect(backendTs('valkey')).toContain("import { ValkeyCluster } from '@newt-js/core/cluster/valkey'\n")
    expect(backendTs('valkey')).toContain("new Platform({ cluster: stores === 'memory' ? new MemoryCluster() : new ValkeyCluster(Bun.env.VALKEY_URL) })")
  })

  test("the lint's parser stack gets TypeScript 6, whatever TypeScript the project has", () => {
    const change = changeTo(backendTemplate({ folder: '.', name: 'shop', port: 3000, stores: STORES, versions: VERSIONS }), 'package.json')
    const overrides = (change?.action === 'complete-json' ? change.values.overrides : {}) as Record<string, unknown>
    expect(overrides['@typescript-eslint/typescript-estree']).toEqual({ typescript: 'npm:@typescript/typescript6@6.0.2' })
    expect(overrides).not.toHaveProperty('typescript')
  })

  test('its package is named as told, with newt at its version and the rest at theirs', () => {
    const change = changeTo(backendTemplate({ folder: '.', name: 'shop', port: 3000, stores: STORES, versions: VERSIONS }), 'package.json')
    expect(change?.action === 'complete-json' && change.values).toMatchObject({
      name: 'shop',
      dependencies: { '@newt-js/core': '1.2.3', 'zod': '4.0.0' },
      devDependencies: { '@newt-js/cli': '1.2.3', '@newt-js/lint': '1.2.3', '@types/bun': '1.4.0', 'eslint': '10.0.0' },
    })
  })

  test('its port and the files\' variables in .env, and in .env.example without the secret', () => {
    const changes = backendTemplate({ folder: '.', name: 'shop', port: 3010, stores: STORES, versions: VERSIONS })
    const variablesOf = (path: string) => {
      const change = changeTo(changes, path)
      return change?.action === 'complete-env' ? change.variables : {}
    }
    expect(variablesOf('.env')).toEqual({ PORT: '3010', PUBLIC_URL: 'http://localhost:3010', FILES_SECRET: expect.stringMatching(/^[0-9a-f]{64}$/) })
    expect(variablesOf('.env.example')).toEqual({ PORT: '3010', PUBLIC_URL: 'http://localhost:3010', FILES_SECRET: '' })
  })
})
