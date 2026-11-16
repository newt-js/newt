// bun tools/release/publish.ts [--publish]: checks everything, then publishes each package in order; a dry run without --publish.
import { $ }           from 'bun'
import { join }        from 'node:path'
// --------------------------------------------------------
import { PACKAGES }    from './packages'
import { publishedAt } from './published-at'

const ROOT = join(import.meta.dir, '../..')

const publishing = Bun.argv.includes('--publish')

const refuse = (why: string): never => {
  console.error(why)
  process.exit(1)
}

const versions = await Promise.all(PACKAGES.map(async ({ folder }) => (await Bun.file(join(ROOT, folder, 'package.json')).json() as { version: string }).version))
if (new Set(versions).size !== 1) refuse(`The packages are not at one version (${versions.join(', ')}): bun run release:version <version>`)
const version = versions[0]!

const published = publishing ? await Promise.all(PACKAGES.map(({ name }) => publishedAt(name, version))) : PACKAGES.map(() => null)
if (publishing) {
  if (version === '0.0.0') refuse('The packages are at 0.0.0: bun run release:version <version> first')
  if ((await $`git status --porcelain`.cwd(ROOT).text()).trim() !== '') refuse('The tree has changes not committed: commit the release first')
  const branch = (await $`git branch --show-current`.cwd(ROOT).text()).trim()
  if (branch !== 'main') refuse(`This is ${branch}: releases are published from main`)
  if (published.every(Boolean)) refuse(`${version} is published already: bun run release:version <a higher one>`)
  // Only a publish of this commit that stopped halfway leaves a package on npm at this version.
  const committed = new Date((await $`git log -1 --format=%cI`.cwd(ROOT).text()).trim())
  const before = PACKAGES.filter((_, at) => published[at] && published[at] < committed)
  if (before.length > 0) refuse(`${before.map(({ name }) => `${name}@${version}`).join(', ')} was on npm before this commit: bun run release:version <a higher one>`)
}

for (const script of ['typecheck', 'test', 'lint', 'check-packs']) {
  const ran = await $`bun run ${script}`.cwd(ROOT)
  // CI runs every service the tests need, so a test skipped there is one nobody would notice gone.
  const skipped = script === 'test' && Bun.env.CI ? /^\s*(\d+) skip$/m.exec(ran.stderr.toString()) : null
  if (skipped) refuse(`${skipped[1]} tests were skipped, and in CI every test runs: start the service they wait for, or set the variable they read`)
}
const tag = version.includes('-') ? ['--tag', 'next'] : []
for (const [at, { name, folder }] of PACKAGES.entries()) {
  // A publish that stopped halfway is run again: the packages it published are left as they are.
  if (published[at]) {
    console.log(`${name}@${version} is published already`)
    continue
  }
  // The dry run packs alone: it needs no npm login.
  if (publishing) await $`bun publish --access public --tolerate-republish ${tag}`.cwd(join(ROOT, folder))
  else await $`bun pm pack --dry-run`.cwd(join(ROOT, folder))
}
console.log(publishing ? `Published ${version}` : `Dry run of ${version}: nothing was published. With --publish, it is.`)
