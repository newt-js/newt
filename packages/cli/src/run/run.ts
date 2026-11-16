import { parseArgs }        from 'node:util'
// --------------------------------------------------------
import { Command }          from '../commands/command'
import { CommandContext }   from '../commands/command'
import { Output }           from '../commands/command'
import { newtHelp }         from '../help/newt-help/newt-help'
import { NEWT_OPTIONS }     from '../options/newt-options'
import { parseArgsOptions } from '../options/parse-args-options/parse-args-options'
import { version }          from '../version/version'
import { findCommand }      from './find-command/find-command'
import { runCommand }       from './run-command/run-command'

export type RunContext = CommandContext & { commands: Command[] }

export async function run(args: string[], { commands, ...context }: RunContext): Promise<Output> {
  const found = findCommand(args, commands)
  if (found) {
    return runCommand(found.command, found.rest, context)
  }
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions(NEWT_OPTIONS) })
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
