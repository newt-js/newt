import { parseArgs }           from 'node:util'
// --------------------------------------------------------
import type { Command }        from '../../commands/command'
import type { CommandContext } from '../../commands/command'
import type { OptionValues }   from '../../commands/command'
import type { Options }        from '../../commands/command'
import type { Output }         from '../../commands/command'
import { CommandError }        from '../../commands/command-error/command-error'
import { commandHelp }         from '../../help/command-help/command-help'
import { COMMAND_OPTIONS }     from '../../options/newt-options'
import { parseArgsOptions }    from '../../options/parse-args-options/parse-args-options'
import { applyResult }         from '../../report/apply-result/apply-result'
import { errorReport }         from '../../report/error-report/error-report'
import { humanReport }         from '../../report/human-report/human-report'
import { jsonReport }          from '../../report/json-report/json-report'

export async function runCommand(command: Command, args: string[], { cwd, ask }: CommandContext): Promise<Output> {
  const json = args.includes('--json')
  const failed = (message: string): Output => ({ code: 1, text: errorReport(message, json), json })
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions({ ...command.options, ...COMMAND_OPTIONS }) })
  } catch (error) {
    return failed(`${(error as Error).message}\nRun newt ${command.name} --help.`)
  }
  const { 'help': help, 'json': _json, 'dry-run': dryRun, ...options } = parsed.values
  const twice = Object.keys(parsed.values).find(name => args.filter(arg => arg === `--${name}` || arg.startsWith(`--${name}=`)).length > 1)
  if (twice) {
    return failed(`--${twice} is given twice: give it once`)
  }
  if (help) {
    return { code: 0, text: commandHelp(command) }
  }
  if (!command.args && parsed.positionals.length > 0) {
    return failed(`newt ${command.name} takes no arguments, and was given ${parsed.positionals.join(' ')}.\nRun newt ${command.name} --help.`)
  }
  try {
    const result = await command.run({ args: parsed.positionals, options: options as OptionValues<Options>, cwd, ask: json ? null : ask })
    const report = await applyResult(result, cwd, dryRun === true)
    return { code: 0, text: json ? jsonReport(report) : humanReport(report), json }
  } catch (error) {
    if (!(error instanceof CommandError)) throw error
    return failed(error.message)
  }
}
