import { parseArgs }           from 'node:util'
// --------------------------------------------------------
import type { Command }        from '../commands/command'
import type { CommandContext } from '../commands/command'
import type { Output }         from '../commands/command'
import { newtHelp }            from '../help/newt-help/newt-help'
import { NEWT_OPTIONS }        from '../options/newt-options'
import { parseArgsOptions }    from '../options/parse-args-options/parse-args-options'
import { errorReport }         from '../report/error-report/error-report'
import { version }             from '../version/version'
import { findCommand }         from './find-command/find-command'
import { runCommand }          from './run-command/run-command'

export type RunContext = CommandContext & { commands: Command[] }

/** Flags every command takes, which may come before its name too: newt --json add module … */
const BEFORE_COMMAND = new Set(['--json', '--dry-run'])

export async function run(args: string[], { commands, ...context }: RunContext): Promise<Output> {
  const first = args.findIndex(arg => !BEFORE_COMMAND.has(arg))
  const leading = first === -1 ? args : args.slice(0, first)
  const found = findCommand(args.slice(leading.length), commands)
  if (found) {
    return runCommand(found.command, [...found.rest, ...leading], context)
  }
  const json = args.includes('--json')
  const failed = (message: string): Output => ({ code: 1, text: errorReport(message, json), json })
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions(NEWT_OPTIONS) })
  } catch (error) {
    return failed(`${(error as Error).message}\nRun newt --help.`)
  }
  const { values, positionals } = parsed
  if (values.version) {
    return json ? { code: 0, text: JSON.stringify({ version: await version() }, null, 2), json } : { code: 0, text: await version() }
  }
  const [command] = positionals
  if (values.help || command === undefined) {
    return json ? { code: 0, text: JSON.stringify({ help: await newtHelp(commands) }, null, 2), json } : { code: 0, text: await newtHelp(commands) }
  }
  const family = commands.filter(each => each.name.startsWith(`${command} `)).map(each => `newt ${each.name}`)
  if (family.length > 0) {
    const [, what] = positionals
    return failed(`${what === undefined ? `newt ${command} takes what to ${command}` : `Unknown command '${command} ${what}'`}: ${family.join(', ')}. Run newt --help.`)
  }
  return failed(`Unknown command '${command}'. Run newt --help.`)
}
