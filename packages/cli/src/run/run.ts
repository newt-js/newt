import { parseArgs }        from 'node:util'
// --------------------------------------------------------
import { Command }          from '../commands/command'
import { Output }           from '../commands/command'
import { newtHelp }         from '../help/newt-help/newt-help'
import { GLOBAL_OPTIONS }   from '../options/global-options'
import { parseArgsOptions } from '../options/parse-args-options/parse-args-options'
import { version }          from '../version/version'
import { findCommand }      from './find-command/find-command'
import { runCommand }       from './run-command/run-command'

export type RunContext = { commands: Command[], cwd: string }

export async function run(args: string[], { commands, cwd }: RunContext): Promise<Output> {
  const found = findCommand(args, commands)
  if (found) {
    return runCommand(found.command, found.rest, cwd)
  }
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions(GLOBAL_OPTIONS) })
  } catch (error) {
    return { code: 1, text: `${(error as Error).message}\nRun newt --help.` }
  }
  const { values, positionals } = parsed
  if (values.version) {
    return { code: 0, text: await version() }
  }
  const [command] = positionals
  if (values.help || command === undefined) {
    return { code: 0, text: await newtHelp(commands) }
  }
  return { code: 1, text: `Unknown command '${command}'. Run newt --help.` }
}
