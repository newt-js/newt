import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { defineCommand }  from '../../commands/command'
import { generate }       from '../generate/generate'
import { checkGenerated } from './check-generated'

const PROJECT = {
  'package.json': JSON.stringify({
    name: 'generated',
    type: 'module',
    scripts: { typecheck: 'bun check -b', lint: 'bun --bun eslint' },
    dependencies: { '@newt-js/core': '0.0.0', 'zod': '4.3.6' },
    devDependencies: { '@newt-js/lint': '0.0.0', '@types/bun': '1.4.4', 'eslint': '10.12.0' },
  }),
  'tsconfig.json': JSON.stringify({
    compilerOptions: { strict: true, target: 'ESNext', lib: ['ESNext'], module: 'Preserve', moduleResolution: 'bundler', types: ['bun'], noEmit: true, skipLibCheck: true },
    include: ['**/*.ts'],
  }),
  'eslint.config.ts': "import { newt } from '@newt-js/lint'\n\nexport default newt({\n  root: import.meta.dirname,\n  contexts: { folder: 'src/contexts' },\n})\n",
  'src/email.ts': "import { Email } from '@newt-js/core'\n\nexport const email = (text: string): Email => Email.from(text)\n",
  'src/email.test.ts': "import { expect, test } from 'bun:test'\nimport { email } from './email'\n\ntest('email', () => {\n  expect(email(' A@B.com ') as string).toBe('a@b.com')\n})\n",
}

const BREAKS = {
  lint: { 'src/contexts/shop/modules/order/helpers.ts': 'export const helper = 1\n' },
  types: { 'src/wrong.ts': "export const count: number = 'one'\n" },
  tests: { 'src/wrong.test.ts': "import { expect, test } from 'bun:test'\n\ntest('wrong', () => {\n  expect(1).toBe(2)\n})\n" },
}

const PROJECT_COMMAND = defineCommand({
  name: 'project',
  summary: 'A small project, broken if asked',
  options: { break: { type: 'string', description: 'lint, types or tests' } },
  run: async ({ options }) => {
    const files = { ...PROJECT, ...BREAKS[options.break as keyof typeof BREAKS] }
    return { changes: Object.entries(files).map(([path, content]) => ({ action: 'create' as const, path, content })) }
  },
})

describe('checkGenerated', () => {
  test('passes a project whose lint, types and tests pass', async () => {
    expect(await checkGenerated(await generate(PROJECT_COMMAND))).toEqual([])
  }, 30_000)

  test("fails a project that breaks newt's lint", async () => {
    const failures = await checkGenerated(await generate(PROJECT_COMMAND, ['--break', 'lint']))
    expect(failures).toHaveLength(1)
    expect(failures[0]).toStartWith('lint failed:')
    expect(failures[0]).toContain('newt/module-files')
  }, 30_000)

  test('fails a project with a type error', async () => {
    const failures = await checkGenerated(await generate(PROJECT_COMMAND, ['--break', 'types']))
    expect(failures.map(failure => failure.split(':')[0])).toContain('typecheck failed')
  }, 30_000)

  test('fails a project whose tests fail', async () => {
    const failures = await checkGenerated(await generate(PROJECT_COMMAND, ['--break', 'tests']))
    expect(failures.map(failure => failure.split(':')[0])).toEqual(['tests failed'])
  }, 30_000)
})
