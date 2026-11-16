import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
import { mkdtemp }             from 'node:fs/promises'
import { tmpdir }              from 'node:os'
import { join }                from 'node:path'
// --------------------------------------------------------
import { runCommand }          from '../../run/run-command/run-command'
import { writeBunInitProject } from '../../testing/bun-init-project/bun-init-project'
import { checkGenerated }      from '../../testing/check-generated/check-generated'
import { generate }            from '../../testing/generate/generate'
import { INIT }                from './init'

const emptyFolder = () => mkdtemp(join(tmpdir(), 'newt-cli-init-'))

describe('newt init', () => {
  test('creates the backend in a folder of its name, whose lint, types and tests pass', async () => {
    const folder = join(await generate(INIT, ['shop']), 'shop')
    expect((await Bun.file(join(folder, 'package.json')).json()).name).toBe('shop')
    expect(await checkGenerated(folder)).toEqual([])
  }, 30_000)

  test('with ., in this folder, named after it', async () => {
    const folder = await generate(INIT, ['.'])
    expect((await Bun.file(join(folder, 'package.json')).json()).name).toStartWith('newt-cli-generated-')
  })

  test('run again, it changes nothing', async () => {
    const folder = await generate(INIT, ['shop'])
    const before = await Bun.file(join(folder, 'shop/package.json')).text()
    const output = await runCommand(INIT, ['shop', '--port', '4000', '--json'], { cwd: folder, ask: null })
    const report = JSON.parse(output.text) as { files: { status: string }[] }
    expect(report.files.length).toBeGreaterThan(0)
    expect(report.files.every(file => file.status === 'skipped')).toBe(true)
    expect(await Bun.file(join(folder, 'shop/package.json')).text()).toBe(before)
  })

  test('with --cluster valkey, a backend that shares through Valkey, whose lint, types and tests pass', async () => {
    const folder = join(await generate(INIT, ['shop', '--cluster', 'valkey']), 'shop')
    expect(await Bun.file(join(folder, 'src/backend.ts')).text()).toContain('new ValkeyCluster(Bun.env.VALKEY_URL)')
    expect(await Bun.file(join(folder, '.env.example')).text()).toStartWith('PORT=3000\nVALKEY_URL=redis://localhost:6379\n')
    expect(await checkGenerated(folder)).toEqual([])
  }, 30_000)

  test('refuses a cluster there is not', async () => {
    const output = await runCommand(INIT, ['shop', '--cluster', 'redis'], { cwd: await emptyFolder(), ask: null })
    expect(output).toEqual({ code: 1, text: "'redis' is not a cluster: memory or valkey" })
  })

  test('serves on the port told', async () => {
    const folder = await generate(INIT, ['shop', '--port', '3010'])
    expect(await Bun.file(join(folder, 'shop/.env')).text()).toStartWith('PORT=3010\n')
  })

  test('says what to do next, from the folder it was run in', async () => {
    const named = await runCommand(INIT, ['shop', '--dry-run'], { cwd: await emptyFolder(), ask: null })
    expect(named.text).toEndWith('Next steps:\n  cd shop\n  bun install\n  bun run dev')
    const here = await runCommand(INIT, ['.', '--dry-run'], { cwd: await emptyFolder(), ask: null })
    expect(here.text).toEndWith('Next steps:\n  bun install\n  bun run dev')
  })

  test('asks for the name in a terminal, and never with --json', async () => {
    const asked = await runCommand(INIT, ['--dry-run'], { cwd: await emptyFolder(), ask: async question => question.startsWith('What') ? 'shop' : 'backend' })
    expect(asked.text).toContain('will create  shop/package.json')
    const json = await runCommand(INIT, ['--json'], { cwd: await emptyFolder(), ask: async () => 'shop' })
    expect(json.code).toBe(1)
    expect(JSON.parse(json.text).error).toStartWith("newt init needs the project's name")
  })

  test('over what bun init leaves, makes it a backend whose lint, types and tests pass', async () => {
    const folder = join(await emptyFolder(), 'shop')
    await writeBunInitProject(folder)
    const output = await runCommand(INIT, ['.', '--json'], { cwd: folder, ask: null })
    const report = JSON.parse(output.text) as { files: { path: string, status: string }[], warnings: string[] }
    const statusOf = (path: string) => report.files.filter(file => file.path === path).map(file => file.status)
    expect(statusOf('package.json')).toEqual(['updated', 'updated'])
    expect(statusOf('tsconfig.json')).toEqual(['skipped'])
    expect(statusOf('index.ts')).toEqual(['removed'])
    expect(statusOf('.gitignore')).toEqual(['updated'])
    expect(statusOf('CLAUDE.md')).toEqual(['updated'])
    expect(report.warnings).toEqual([
      'package.json: scripts.typecheck is "bun check", newt\'s is "bun check -b"; newt left it as it is',
      'package.json: devDependencies.@types/bun is "latest", newt\'s is "1.4.4"; newt left it as it is',
    ])
    expect(await Bun.file(join(folder, 'package.json')).json()).not.toHaveProperty('module')
    expect(await Bun.file(join(folder, 'README.md')).text()).toStartWith('# shop')
    expect(await checkGenerated(folder)).toEqual([])
  }, 30_000)

  test("over bun init's index.ts changed by its owner, keeps it and warns", async () => {
    const folder = await emptyFolder()
    await writeBunInitProject(folder, { 'index.ts': 'console.log("mine")\n' })
    const output = await runCommand(INIT, ['.', '--json'], { cwd: folder, ask: null })
    expect(JSON.parse(output.text).warnings).toContain('index.ts was changed, so newt left it, though the backend starts at src/index.ts')
    expect((await Bun.file(join(folder, 'package.json')).json()).module).toBe('index.ts')
  })

  test('--monorepo makes a root whose workspaces take apps/api, and a backend there whose lint, types and tests pass', async () => {
    const root = join(await generate(INIT, ['shop', '--monorepo']), 'shop')
    expect(await Bun.file(join(root, 'package.json')).json()).toMatchObject({ name: 'shop', private: true, workspaces: ['apps/*'], scripts: { test: "bun run --filter '*' test" } })
    expect(await Bun.file(join(root, '.gitignore')).text()).toBe('node_modules\n')
    expect((await Bun.file(join(root, 'apps/api/package.json')).json()).name).toBe('api')
    expect(await checkGenerated(join(root, 'apps/api'))).toEqual([])
  }, 30_000)

  test('--backend puts the first backend elsewhere', async () => {
    const root = join(await generate(INIT, ['shop', '--monorepo', '--backend', 'services/core']), 'shop')
    expect((await Bun.file(join(root, 'package.json')).json()).workspaces).toEqual(['services/*'])
    expect((await Bun.file(join(root, 'services/core/package.json')).json()).name).toBe('core')
  })

  test('--backend without --monorepo says to add it', async () => {
    const output = await runCommand(INIT, ['shop', '--backend', 'apps/api'], { cwd: await emptyFolder(), ask: null })
    expect(output).toEqual({ code: 1, text: '--backend says where a monorepo has its first backend: add --monorepo' })
  })

  test('asked from scratch in a terminal, asks the name and then whether a backend or a monorepo', async () => {
    const questions: string[] = []
    const output = await runCommand(INIT, ['--dry-run'], {
      cwd: await emptyFolder(),
      ask: async question => {
        questions.push(question)
        return questions.length === 1 ? 'shop' : 'monorepo'
      },
    })
    expect(questions).toEqual(['What is your project named?', 'A backend or a monorepo? (backend or monorepo)'])
    expect(output.text).toContain('will create  shop/apps/api/src/backend.ts')
  })

  test('given a name, it never asks whether a backend or a monorepo', async () => {
    const questions: string[] = []
    await runCommand(INIT, ['shop', '--dry-run'], { cwd: await emptyFolder(), ask: async question => {
      questions.push(question)
      return 'monorepo'
    } })
    expect(questions).toEqual([])
  })

  const COMBINATIONS = [
    ...['sqlite', 'postgres', 'mysql', 'memory'].map(db => ({ db, files: 'local' })),
    ...['s3', 'memory'].map(files => ({ db: 'sqlite', files })),
  ]

  for (const { db, files } of COMBINATIONS) {
    test(`--db ${db} --files ${files}: src/stores.ts opens them, and the backend passes its lint, types and, without services, its tests`, async () => {
      const folder = join(await generate(INIT, ['shop', '--db', db, '--files', files]), 'shop')
      const stores = await Bun.file(join(folder, 'src/stores.ts')).text()
      expect(stores).toContain('export function openDatabase(context: string, migrations: string): Promise<Database> {')
      expect(stores).toContain('export async function openStorage(context: string, router: HttpRouter): Promise<StorageOptions> {')
      const needsService = ['postgres', 'mysql'].includes(db) || files === 's3'
      expect(await checkGenerated(folder, { tests: !needsService })).toEqual([])
    }, 30_000)
  }

  test('refuses a database or a storage there is not', async () => {
    expect((await runCommand(INIT, ['shop', '--db', 'mongo'], { cwd: await emptyFolder(), ask: null })).text).toBe("'mongo' is not a database: sqlite, postgres, mysql, memory")
    expect((await runCommand(INIT, ['shop', '--files', 'ftp'], { cwd: await emptyFolder(), ask: null })).text).toBe("'ftp' is not a storage for files: local, s3, memory")
  })
})
