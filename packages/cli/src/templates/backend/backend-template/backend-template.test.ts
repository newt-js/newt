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

const VERSIONS = { newt: '1.2.3', zod: '4.0.0', eslint: '10.0.0', bunTypes: '1.4.0', react: '19.0.0', reactDom: '19.0.0', reactTypes: '19.0.0', reactDomTypes: '19.0.0' }

const BACKEND_COMMAND = defineCommand({
  name: 'backend',
  summary: 'The backend template',
  run: async () => ({ changes: backendTemplate({ folder: '.', name: 'shop', port: 3000, cluster: 'memory', versions: await templateVersions() }) }),
})

const changeTo = (changes: FileChange[], path: string) => changes.find(change => change.path === path)

describe('backendTemplate', () => {
  test('a backend whose lint, types and tests pass, and which answers its health', async () => {
    expect(await checkGenerated(await generate(BACKEND_COMMAND))).toEqual([])
  }, 30_000)

  test('what it does to each file, in the folder given', () => {
    expect(backendTemplate({ folder: 'apps/shop', name: 'shop', port: 3000, cluster: 'memory', versions: VERSIONS }).map(change => `${change.action} ${change.path}`)).toEqual([
      'complete-json apps/shop/package.json',
      'create apps/shop/tsconfig.json',
      'create apps/shop/eslint.config.ts',
      'create apps/shop/.env',
      'create apps/shop/.env.example',
      'create apps/shop/AGENTS.md',
      'create apps/shop/src/index.ts',
      'create apps/shop/src/backend.ts',
      'create apps/shop/src/backend.test.ts',
      'create apps/shop/src/contexts.ts',
      'ensure-lines apps/shop/.gitignore',
      'ensure-lines apps/shop/CLAUDE.md',
      'remove-unchanged apps/shop/index.ts',
      'remove-json-key apps/shop/package.json',
    ])
  })

  test('its package is named as told, with newt at its version and the rest at theirs', () => {
    const change = changeTo(backendTemplate({ folder: '.', name: 'shop', port: 3000, cluster: 'memory', versions: VERSIONS }), 'package.json')
    expect(change?.action === 'complete-json' && change.values).toMatchObject({
      name: 'shop',
      dependencies: { '@newt-js/core': '1.2.3', 'zod': '4.0.0' },
      devDependencies: { '@newt-js/cli': '1.2.3', '@newt-js/lint': '1.2.3', '@types/bun': '1.4.0', 'eslint': '10.0.0' },
    })
  })

  test('its port in .env and .env.example', () => {
    const changes = backendTemplate({ folder: '.', name: 'shop', port: 3010, cluster: 'memory', versions: VERSIONS })
    for (const path of ['.env', '.env.example']) {
      const change = changeTo(changes, path)
      expect(change?.action === 'create' && change.content).toBe('PORT=3010\n')
    }
  })
})
