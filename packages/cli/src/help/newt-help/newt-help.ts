import type { Command } from '../../commands/command'
import { NEWT_OPTIONS } from '../../options/newt-options'
import { columns }      from '../../text/columns/columns'
import { version }      from '../../version/version'
import { optionsHelp }  from '../options-help/options-help'

/** What --json prints, for agents. */
export const JSON_SHAPE = 'With --json, a command prints { dryRun, files: [{ path, status, note? }], warnings, nextSteps },\nor { error } with exit code 1; paths are from where it runs.'

export async function newtHelp(commands: Command[]): Promise<string> {
  const sorted = commands.toSorted((a, b) => a.name.localeCompare(b.name))
  const commandsHelp = sorted.length === 0
    ? []
    : ['', 'Commands:', ...columns(sorted.map(command => [[command.name, command.args].filter(Boolean).join(' '), command.summary]))]
  const footer = sorted.length === 0 ? [] : ['', "Run newt <command> --help to see a command's options.", '', JSON_SHAPE]
  return [
    `newt ${await version()}`,
    '',
    'Usage: newt <command> [options]',
    ...commandsHelp,
    '',
    'Options:',
    ...optionsHelp(NEWT_OPTIONS),
    ...footer,
  ].join('\n')
}
