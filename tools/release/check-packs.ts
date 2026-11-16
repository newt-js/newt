// bun tools/release/check-packs.ts [--keep]: a backend made from the packed packages, as a user gets them, passes its checks.
import { $ }        from 'bun'
import { mkdtemp }  from 'node:fs/promises'
import { rm }       from 'node:fs/promises'
import { tmpdir }   from 'node:os'
import { join }     from 'node:path'
// --------------------------------------------------------
import { PACKAGES } from './packages'

const ROOT = join(import.meta.dir, '../..')

type Manifest = { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }

/** Every package, packed as npm would get it: `workspace:*` turned into its version. */
async function packed(into: string): Promise<Record<string, string>> {
  const tarballs: Record<string, string> = {}
  for (const { name, folder } of PACKAGES) {
    await $`bun pm pack --destination ${into} --quiet`.cwd(join(ROOT, folder))
    const [tarball] = await Array.fromAsync(new Bun.Glob(`${name.replace('@', '').replace('/', '-')}-*.tgz`).scan({ cwd: into, absolute: true }))
    if (!tarball) throw new Error(`${folder} packed no tarball`)
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
  await Bun.write(file, `${JSON.stringify({ ...manifest, overrides: tarballs }, null, 2)}\n`)
}

const keep = Bun.argv.includes('--keep')
const work = await mkdtemp(join(tmpdir(), 'newt-packs-'))
try {
  const tarballs = await packed(join(work, 'packs'))
  const tool = join(work, 'tool')
  await Bun.write(join(tool, 'package.json'), JSON.stringify({ private: true, dependencies: { '@newt-js/cli': tarballs['@newt-js/cli'] } }))
  await $`bun install`.cwd(tool).quiet()
  await $`${join(tool, 'node_modules/.bin/newt')} init shop`.cwd(work).quiet()
  const app = join(work, 'shop')
  await fromTarballs(app, tarballs)
  await $`bun install`.cwd(app).quiet()
  for (const args of [['add', 'context', 'sales'], ['add', 'module', 'sales/order'], ['add', 'use-case', 'sales/order', 'mark-paid']]) {
    await $`bunx newt ${args}`.cwd(app).quiet()
  }
  for (const script of ['typecheck', 'test', 'lint']) {
    await $`bun run ${script}`.cwd(app)
  }
  console.log(`The packed packages make a backend that passes its checks${keep ? `: ${app}` : ''}`)
} finally {
  if (!keep) await rm(work, { recursive: true, force: true })
}
