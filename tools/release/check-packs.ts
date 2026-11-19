// bun tools/release/check-packs.ts [--keep]: a backend made from the packed packages, as a user gets them, passes its checks.
import { $ }        from 'bun'
import { mkdtemp }  from 'node:fs/promises'
import { rm }       from 'node:fs/promises'
import { tmpdir }   from 'node:os'
import { join }     from 'node:path'
// --------------------------------------------------------
import { PACKAGES } from './packages'

const ROOT = join(import.meta.dir, '../..')

/** What only newt's own tests use, which no package ships. */
const TEST_ONLY = /\.test\.tsx?$|\/contract\/|\/fixtures[^/]*\/|\/database\/[^/]+\/testing\//

type Manifest = { dependencies?: Record<string, string>, devDependencies?: Record<string, string>, overrides?: Record<string, unknown> }

/** Every package, packed as npm would get it: `workspace:*` turned into its version. */
async function packed(into: string): Promise<Record<string, string>> {
  const tarballs: Record<string, string> = {}
  for (const { name, folder } of PACKAGES) {
    await $`bun pm pack --destination ${into} --quiet`.cwd(join(ROOT, folder))
    const [tarball] = await Array.fromAsync(new Bun.Glob(`${name.replace('@', '').replace('/', '-')}-[0-9]*.tgz`).scan({ cwd: into, absolute: true }))
    if (!tarball) throw new Error(`${folder} packed no tarball`)
    const shipped = (await $`tar -tzf ${tarball}`.text()).split('\n').filter(path => TEST_ONLY.test(path))
    if (shipped.length > 0) throw new Error(`${folder} ships what only its tests use:\n${shipped.join('\n')}`)
    tarballs[name] = `file:${tarball}`
  }
  return tarballs
}

/** The project's newt packages from their tarballs, never from npm, where they are not published yet. */
async function fromTarballs(project: string, tarballs: Record<string, string>): Promise<void> {
  const file = Bun.file(join(project, 'package.json'))
  const manifest = await file.json() as Manifest
  for (const field of ['dependencies', 'devDependencies'] as const) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (tarballs[name]) manifest[field]![name] = tarballs[name]
    }
  }
  await Bun.write(file, `${JSON.stringify({ ...manifest, overrides: { ...manifest.overrides, ...tarballs } }, null, 2)}\n`)
}

/** The TypeScript a project's editor and `bunx tsc` find is the 7 its package.json asks for, not the lint's 6. */
async function topTypescriptIs7(project: string): Promise<void> {
  const { version } = await Bun.file(join(project, 'node_modules/typescript/package.json')).json() as { version: string }
  if (!version.startsWith('7.')) throw new Error(`${project}'s node_modules/typescript is ${version}, not 7`)
}

const keep = Bun.argv.includes('--keep')
const work = await mkdtemp(join(tmpdir(), 'newt-packs-'))
try {
  const tarballs = await packed(join(work, 'packs'))
  const tool = join(work, 'tool')
  await Bun.write(join(tool, 'package.json'), JSON.stringify({ private: true, dependencies: { 'create-newt': tarballs['create-newt'] }, overrides: tarballs }))
  await $`bun install`.cwd(tool).quiet()
  await $`${join(tool, 'node_modules/.bin/create-newt')} shop`.cwd(work).quiet()
  const app = join(work, 'shop')
  await fromTarballs(app, tarballs)
  await $`bun install`.cwd(app).quiet()
  for (const args of [['add', 'context', 'sales'], ['add', 'module', 'sales/orders/order'], ['add', 'use-case', 'sales/orders/order', 'mark-paid']]) {
    await $`bunx newt ${args}`.cwd(app).quiet()
  }
  await topTypescriptIs7(app)
  for (const script of ['typecheck', 'test', 'lint']) {
    await $`bun run ${script}`.cwd(app)
  }
  // A monorepo, hoisted as an older lockfile or linker = "hoisted" leaves it.
  await $`${join(tool, 'node_modules/.bin/create-newt')} mono --monorepo --backend apps/api`.cwd(work).quiet()
  const mono = join(work, 'mono')
  await fromTarballs(mono, tarballs)
  await fromTarballs(join(mono, 'apps/api'), tarballs)
  await $`bun install --linker hoisted`.cwd(mono).quiet()
  await topTypescriptIs7(mono)
  await $`bunx newt add context sales`.cwd(join(mono, 'apps/api')).quiet()
  for (const script of ['typecheck', 'test', 'lint']) {
    await $`bun run ${script}`.cwd(mono)
  }
  console.log(`The packed packages make a backend and a monorepo that pass their checks, with TypeScript 7 too${keep ? `: ${work}` : ''}`)
} finally {
  if (!keep) await rm(work, { recursive: true, force: true })
}
