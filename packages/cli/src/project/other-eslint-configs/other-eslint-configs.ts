import { join } from 'node:path'

const OTHERS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.mts', 'eslint.config.cts']

/** The ESLint configs in a folder besides eslint.config.ts, which ESLint would read instead of newt's. */
export async function otherEslintConfigs(folder: string): Promise<string[]> {
  const found: string[] = []
  for (const name of OTHERS) {
    if (await Bun.file(join(folder, name)).exists()) found.push(name)
  }
  return found
}
