import { join }             from 'node:path'
// --------------------------------------------------------
import { linkDependencies } from '../link-dependencies/link-dependencies'

const STEPS = {
  lint: (folder: string) => ['--bun', join(folder, 'node_modules/eslint/bin/eslint.js'), '.'],
  typecheck: () => ['check'],
  tests: () => ['test'],
}

/** Runs newt's lint, the type check and the tests of a generated project, as its owner would: what failed, with its output. */
export async function checkGenerated(folder: string): Promise<string[]> {
  await linkDependencies(folder)
  const failures: string[] = []
  for (const [step, args] of Object.entries(STEPS)) {
    const child = Bun.spawn([process.execPath, ...args(folder)], { cwd: folder, stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    if (code !== 0) failures.push(`${step} failed:\n${stdout}${stderr}`)
  }
  return failures
}
