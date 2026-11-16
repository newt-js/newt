import { linkDependencies } from '../link-dependencies/link-dependencies'

/** Its own scripts, as its owner runs them. */
const STEPS = {
  lint: ['run', 'lint'],
  typecheck: ['run', 'typecheck'],
  tests: ['test'],
}

/** Runs newt's lint, the type check and the tests of a generated project, as its owner would: what failed, with its output. */
export async function checkGenerated(folder: string, { tests = true, lint = true } = {}): Promise<string[]> {
  await linkDependencies(folder)
  const failures: string[] = []
  for (const [step, args] of Object.entries(STEPS)) {
    if ((step === 'tests' && !tests) || (step === 'lint' && !lint)) continue
    const child = Bun.spawn([process.execPath, ...args], { cwd: folder, stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    if (code !== 0) failures.push(`${step} failed:\n${stdout}${stderr}`)
  }
  return failures
}
