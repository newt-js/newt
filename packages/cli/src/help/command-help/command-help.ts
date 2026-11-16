import { Command }     from '../../commands/command'
import { HELP_OPTION } from '../../options/global-options'
import { optionsHelp } from '../options-help/options-help'

export function commandHelp(command: Command): string {
  return [
    `Usage: newt ${[command.name, command.args, '[options]'].filter(Boolean).join(' ')}`,
    '',
    command.summary,
    '',
    'Options:',
    ...optionsHelp({ ...command.options, help: HELP_OPTION }),
  ].join('\n')
}
