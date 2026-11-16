import { version } from '../version/version'

export async function usage(): Promise<string> {
  return [
    `newt ${await version()}`,
    '',
    'Usage: newt <command> [options]',
    '',
    'Options:',
    '  -h, --help     Show this help',
    '  -v, --version  Show the version',
  ].join('\n')
}
