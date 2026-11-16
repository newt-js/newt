import { parseArgs }        from 'node:util'
// --------------------------------------------------------
import { Command }          from '../../commands/command'
import { OptionValues }     from '../../commands/command'
import { Options }          from '../../commands/command'
import { Output }           from '../../commands/command'
import { commandHelp }      from '../../help/command-help/command-help'
import { HELP_OPTION }      from '../../options/global-options'
import { parseArgsOptions } from '../../options/parse-args-options/parse-args-options'

export async function runCommand(command: Command, args: string[], cwd: string): Promise<Output> {
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: parseArgsOptions({ ...command.options, help: HELP_OPTION }) })
  } catch (error) {
    return { code: 1, text: `${(error as Error).message}\nRun newt ${command.name} --help.` }
  }
  const { help, ...options } = parsed.values
  if (help) {
    return { code: 0, text: commandHelp(command) }
  }
  return command.run({ args: parsed.positionals, options: options as OptionValues<Options>, cwd })
}
