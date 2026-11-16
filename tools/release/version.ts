// bun tools/release/version.ts <version>: every published package at that version, and bun.lock with them.
import { $ }           from 'bun'
import { join }        from 'node:path'
// --------------------------------------------------------
import { PACKAGES }    from './packages'
import { publishedAt } from './published-at'

const ROOT = join(import.meta.dir, '../..')

const IDENTIFIER = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)'

const SEMVER = new RegExp(`^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-${IDENTIFIER}(?:\\.${IDENTIFIER})*)?$`)

const refuse = (why: string): never => {
  console.error(why)
  process.exit(1)
}

const [version] = Bun.argv.slice(2)
if (!version || !SEMVER.test(version)) refuse('usage: bun run release:version <version>, as in 0.1.0')
const manifests = await Promise.all(PACKAGES.map(async ({ folder }) => {
  const file = Bun.file(join(ROOT, folder, 'package.json'))
  return { file, text: await file.text() }
}))
const current = (JSON.parse(manifests[0]!.text) as { version: string }).version
if (Bun.semver.order(version!, current) !== 1) refuse(`${version} is not above ${current}, the version the packages are at`)
if ((await $`git status --porcelain`.cwd(ROOT).text()).trim() !== '') refuse('The tree has changes not committed: a release commit holds the release alone')
const taken = (await Promise.all(PACKAGES.map(async ({ name }) => await publishedAt(name, version!) ? name : null))).filter(Boolean)
if (taken.length > 0) refuse(`npm has ${taken.map(name => `${name}@${version}`).join(', ')} already: choose a higher version`)

for (const { file, text } of manifests) {
  await Bun.write(file, `${JSON.stringify({ ...JSON.parse(text) as Record<string, unknown>, version }, null, 2)}\n`)
}
const installed = await $`bun install`.cwd(ROOT).quiet().nothrow()
if (installed.exitCode !== 0) {
  for (const { file, text } of manifests) await Bun.write(file, text)
  refuse(`bun install failed, and the packages are back at ${current}:\n${installed.stderr.toString()}`)
}
console.log(`${PACKAGES.map(each => each.name).join(', ')} at ${version}`)
