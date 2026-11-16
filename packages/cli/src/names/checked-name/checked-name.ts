import { CommandError }  from '../../commands/command-error/command-error'
import { isBackendName } from '../backend-name/backend-name'
import { packageNameOf } from '../package-name-of/package-name-of'

/** The name, when it can name both a folder and a package; else a CommandError that says one that would. */
export function checkedName(name: string): string {
  if (!isBackendName(name)) {
    throw new CommandError(`'${name}' cannot name a folder and a package: use lowercase letters, digits and - . _ ~, as in '${packageNameOf(name)}'`)
  }
  return name
}
