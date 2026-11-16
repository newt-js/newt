import { mkdir }   from 'node:fs/promises'
import { symlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { join }    from 'node:path'

const CLI = join(import.meta.dir, '../../..')
const CLI_MODULES = join(CLI, 'node_modules')

/** Links the generated project's dependencies to the ones this package has, instead of installing them. */
export async function linkDependencies(folder: string): Promise<void> {
  const manifest = await Bun.file(join(folder, 'package.json')).json() as { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }
  const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
  for (const name of names) {
    const source = name === '@newt-js/cli' ? CLI : join(CLI_MODULES, name)
    const target = join(folder, 'node_modules', name)
    if (!await Bun.file(join(source, 'package.json')).exists()) {
      throw new Error(`The generated code depends on ${name}: add it to the devDependencies of @newt-js/cli`)
    }
    if (await Bun.file(join(target, 'package.json')).exists()) continue
    await mkdir(dirname(target), { recursive: true })
    await symlink(source, target)
  }
  // The bins its scripts run, as bun install links them.
  const eslint = join(folder, 'node_modules/.bin/eslint')
  if (names.includes('eslint') && !await Bun.file(eslint).exists()) {
    await mkdir(dirname(eslint), { recursive: true })
    await symlink(join(CLI_MODULES, 'eslint/bin/eslint.js'), eslint)
  }
}
