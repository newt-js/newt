import { CommandError }     from '../../commands/command-error/command-error'
import { STORAGES }         from '../../templates/context/storages'
import type { StorageName } from '../../templates/context/storages'

export const DEFAULT_STORAGE: StorageName = 'local'

const isStorage = (name: string): name is StorageName => Object.hasOwn(STORAGES, name)

export function storageOf(given: string | undefined): StorageName {
  if (given === undefined) return DEFAULT_STORAGE
  if (!isStorage(given)) {
    throw new CommandError(`'${given}' is not a storage for files: ${Object.keys(STORAGES).join(', ')}`)
  }
  return given
}
