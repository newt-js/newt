import type { Command }    from '../../commands/command'
import { COMMAND_OPTIONS } from '../../options/newt-options'
import { optionsHelp }     from '../options-help/options-help'

export function commandHelp(command: Command): string {
  return [
    `Usage: newt ${[command.name, command.args, '[options]'].filter(Boolean).join(' ')}`,
    '',
    command.summary,
    '',
    'Options:',
    ...optionsHelp({ ...command.options, ...COMMAND_OPTIONS }),
  ].join('\n')
}
