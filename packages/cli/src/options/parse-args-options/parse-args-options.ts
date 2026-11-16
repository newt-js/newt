import { ParseArgsOptionsConfig } from 'node:util'
// --------------------------------------------------------
import { Options }                from '../../commands/command'

export function parseArgsOptions(options: Options): ParseArgsOptionsConfig {
  return Object.fromEntries(Object.entries(options).map(([name, { type, short }]) => [name, short ? { type, short } : { type }]))
}
