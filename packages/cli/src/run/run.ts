import { parseArgs } from 'node:util'
// --------------------------------------------------------
import { usage }     from './usage/usage'
import { version }   from './version/version'

export type Output = { code: number, text: string }

export async function run(args: string[]): Promise<Output> {
  let parsed
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } } })
  } catch (error) {
    return { code: 1, text: `${(error as Error).message}\nRun newt --help.` }
  }
  const { values, positionals } = parsed
  if (values.version) {
    return { code: 0, text: await version() }
  }
  const [command] = positionals
  if (values.help || command === undefined) {
    return { code: 0, text: await usage() }
  }
  return { code: 1, text: `Unknown command '${command}'. Run newt --help.` }
}
