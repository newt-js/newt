import { basename }      from 'node:path'
// --------------------------------------------------------
import { checkedName }   from '../../../names/checked-name/checked-name'
import { packageNameOf } from '../../../names/package-name-of/package-name-of'
import type { Ask }      from '../../command'
import { CommandError }  from '../../command-error/command-error'

export type ProjectFolder = { folder: string, name: string }

export const SUGGESTED_NAME = 'my-app'

const THIS_FOLDER = '.'

/** Where the project goes and its name: the one given, or asked; `.` is this folder, named after it. */
export async function projectFolder(args: string[], cwd: string, ask: Ask | null): Promise<ProjectFolder> {
  if (args.length > 1) {
    throw new CommandError(`newt init takes one name, and was given ${args.join(' ')}`)
  }
  const name = args[0] ?? await ask?.('What is your project named?', SUGGESTED_NAME)
  if (name === undefined) {
    throw new CommandError("newt init needs the project's name: newt init <name>, or newt init . for this folder")
  }
  if (name === THIS_FOLDER) {
    return { folder: THIS_FOLDER, name: packageNameOf(basename(cwd)) }
  }
  return { folder: checkedName(name), name }
}
