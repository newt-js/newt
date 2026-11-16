import { rmSync }       from 'node:fs'
import { mkdtemp }      from 'node:fs/promises'
import { realpath }     from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import type { Command } from '../../commands/command'
import { runCommand }   from '../../run/run-command/run-command'

const made: string[] = []

process.on('exit', () => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true })
})

/** Runs the command in a new empty folder, which is removed when the tests end, and returns that folder. */
export async function generate(command: Command, args: string[] = []): Promise<string> {
  const folder = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-generated-')))
  made.push(folder)
  const output = await runCommand(command, args, { cwd: folder, ask: null })
  if (output.code !== 0) throw new Error(output.text)
  return folder
}
