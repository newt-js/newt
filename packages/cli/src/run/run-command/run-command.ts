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
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions({ ...command.options, ...COMMAND_OPTIONS }) })
  } catch (error) {
    return { code: 1, text: `${(error as Error).message}\nRun newt ${command.name} --help.` }
  }
  const { 'help': help, 'json': json, 'dry-run': dryRun, ...options } = parsed.values
  if (help) {
    return { code: 0, text: commandHelp(command) }
  }
  if (!command.args && parsed.positionals.length > 0) {
    return { code: 1, text: errorReport(`newt ${command.name} takes no arguments, and was given ${parsed.positionals.join(' ')}.\nRun newt ${command.name} --help.`, json === true) }
  }
  try {
    const result = await command.run({ args: parsed.positionals, options: options as OptionValues<Options>, cwd, ask: json ? null : ask })
    const report = await applyResult(result, cwd, dryRun === true)
    return { code: 0, text: json ? jsonReport(report) : humanReport(report) }
  } catch (error) {
    if (!(error instanceof CommandError)) throw error
    return { code: 1, text: errorReport(error.message, json === true) }
  }
}
