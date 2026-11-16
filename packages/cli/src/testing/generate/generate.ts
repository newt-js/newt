import { mkdtemp }      from 'node:fs/promises'
import { realpath }     from 'node:fs/promises'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import type { Command } from '../../commands/command'
import { runCommand }   from '../../run/run-command/run-command'

/** Runs the command in a new empty folder, in the tests' temporary one, and returns that folder. */
export async function generate(command: Command, args: string[] = []): Promise<string> {
  const folder = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-generated-')))
  const output = await runCommand(command, args, { cwd: folder, ask: null })
  if (output.code !== 0) throw new Error(output.text)
  return folder
}
