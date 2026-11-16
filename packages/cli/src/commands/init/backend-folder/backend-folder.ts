import { basename }      from 'node:path'
// --------------------------------------------------------
import { isBackendName } from '../../../names/backend-name/backend-name'
import { packageNameOf } from '../../../names/package-name-of/package-name-of'
import { Ask }           from '../../command'
import { CommandError }  from '../../command-error/command-error'

export type BackendFolder = { folder: string, name: string }

export const SUGGESTED_NAME = 'my-backend'

const THIS_FOLDER = '.'

/** Where the backend goes and its name: the one given, or asked; `.` is this folder, named after it. */
export async function backendFolder(args: string[], cwd: string, ask: Ask | null): Promise<BackendFolder> {
  if (args.length > 1) {
    throw new CommandError(`newt init takes one name, and was given ${args.join(' ')}`)
  }
  const name = args[0] ?? await ask?.('What is your backend named?', SUGGESTED_NAME)
  if (name === undefined) {
    throw new CommandError("newt init needs the backend's name: newt init <name>, or newt init . for this folder")
  }
  if (name === THIS_FOLDER) {
    return { folder: THIS_FOLDER, name: packageNameOf(basename(cwd)) }
  }
  if (!isBackendName(name)) {
    throw new CommandError(`'${name}' cannot name a backend: use lowercase letters, digits and - . _ ~, as in '${packageNameOf(name)}'`)
  }
  return { folder: name, name }
}
