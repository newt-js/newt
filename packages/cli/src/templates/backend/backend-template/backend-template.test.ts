import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { defineCommand }    from '../../../commands/command'
import { checkGenerated }   from '../../../testing/check-generated/check-generated'
import { generate }         from '../../../testing/generate/generate'
import { templateVersions } from '../../template-versions/template-versions'
import { backendTemplate }  from './backend-template'

const VERSIONS = { newt: '1.2.3', zod: '4.0.0', eslint: '10.0.0', bunTypes: '1.4.0' }

const BACKEND_COMMAND = defineCommand({
  name: 'backend',
  summary: 'The backend template',
  run: async () => ({ changes: backendTemplate({ folder: '.', name: 'shop', port: 3000, versions: await templateVersions() }) }),
})

describe('backendTemplate', () => {
  test('a backend whose lint, types and tests pass, and which answers its health', async () => {
    expect(await checkGenerated(await generate(BACKEND_COMMAND))).toEqual([])
  }, 30_000)

  test('its files, in the folder given', () => {
    expect(backendTemplate({ folder: 'apps/shop', name: 'shop', port: 3000, versions: VERSIONS }).map(change => change.path)).toEqual([
      'apps/shop/package.json',
      'apps/shop/tsconfig.json',
      'apps/shop/eslint.config.ts',
      'apps/shop/.gitignore',
      'apps/shop/.env',
      'apps/shop/.env.example',
      'apps/shop/AGENTS.md',
      'apps/shop/CLAUDE.md',
      'apps/shop/src/index.ts',
      'apps/shop/src/backend.ts',
      'apps/shop/src/backend.test.ts',
      'apps/shop/src/contexts.ts',
    ])
  })

  test('its package is named as told, with newt at its version and the rest at theirs', () => {
    const changes = backendTemplate({ folder: '.', name: 'shop', port: 3000, versions: VERSIONS })
    const manifest = JSON.parse(changes.find(change => change.path === 'package.json')!.content)
    expect(manifest.name).toBe('shop')
    expect(manifest.dependencies).toEqual({ '@newt-js/core': '1.2.3', 'zod': '4.0.0' })
    expect(manifest.devDependencies).toEqual({ '@newt-js/cli': '1.2.3', '@newt-js/lint': '1.2.3', '@types/bun': '1.4.0', 'eslint': '10.0.0' })
  })

  test('its port in .env and .env.example', () => {
    const changes = backendTemplate({ folder: '.', name: 'shop', port: 3010, versions: VERSIONS })
    expect(changes.filter(change => change.path.startsWith('.env')).map(change => change.content)).toEqual(['PORT=3010\n', 'PORT=3010\n'])
  })
})
