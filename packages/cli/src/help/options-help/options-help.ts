import { Options }    from '../../commands/command'
import { columns }    from '../columns/columns'
import { optionFlag } from '../option-flag/option-flag'

export function optionsHelp(options: Options): string[] {
  return columns(Object.entries(options).map(([name, option]) => [optionFlag(name, option), option.description]))
}
