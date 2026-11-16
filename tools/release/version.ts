// bun tools/release/version.ts <version>: every published package at that version, and bun.lock with them.
import { $ }        from 'bun'
import { join }     from 'node:path'
// --------------------------------------------------------
import { PACKAGES } from './packages'

const ROOT = join(import.meta.dir, '../..')

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

const [version] = Bun.argv.slice(2)
if (!version || !SEMVER.test(version)) {
  console.error('usage: bun tools/release/version.ts <version>, as in 0.1.0')
  process.exit(1)
}
for (const { folder } of PACKAGES) {
  const file = Bun.file(join(ROOT, folder, 'package.json'))
  const manifest = await file.json() as Record<string, unknown>
  await Bun.write(file, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`)
}
await $`bun install`.cwd(ROOT).quiet()
console.log(`${PACKAGES.map(each => each.name).join(', ')} at ${version}`)
