// bun tools/release/publish.ts [--publish]: checks everything, then publishes each package in order; a dry run without --publish.
import { $ }        from 'bun'
import { join }     from 'node:path'
// --------------------------------------------------------
import { PACKAGES } from './packages'

const ROOT = join(import.meta.dir, '../..')

const publishing = Bun.argv.includes('--publish')

const versions = await Promise.all(PACKAGES.map(async ({ folder }) => (await Bun.file(join(ROOT, folder, 'package.json')).json() as { version: string }).version))
if (new Set(versions).size !== 1) {
  console.error(`The packages are not at one version (${versions.join(', ')}): bun tools/release/version.ts <version>`)
  process.exit(1)
}
for (const script of ['typecheck', 'test', 'lint', 'check-packs']) {
  await $`bun run ${script}`.cwd(ROOT)
}
const flags = [...publishing ? [] : ['--dry-run'], ...versions[0]!.includes('-') ? ['--tag', 'next'] : []]
for (const { folder } of PACKAGES) {
  await $`bun publish --access public ${flags}`.cwd(join(ROOT, folder))
}
console.log(publishing ? `Published ${versions[0]}` : `Dry run of ${versions[0]}: nothing was published. With --publish, it is.`)
