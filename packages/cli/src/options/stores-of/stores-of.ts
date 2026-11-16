import { CommandError }    from '../../commands/command-error/command-error'
import { STORE_DATABASES } from '../../templates/stores/store-databases'
import { STORE_FILES }     from '../../templates/stores/store-files'
import type { Stores }     from '../../templates/stores/stores'
import { clusterOf }       from '../cluster-of/cluster-of'

export const DEFAULT_DATABASE = 'sqlite'

export const DEFAULT_FILES = 'local'

function kindOf<K extends string>(given: string | undefined, kinds: Record<K, unknown>, fallback: K, what: string): K {
  if (given === undefined) return fallback
  if (!Object.hasOwn(kinds, given)) {
    throw new CommandError(`'${given}' is not ${what}: ${Object.keys(kinds).join(', ')}`)
  }
  return given as K
}

export function storesOf(given: { cluster?: string | undefined, db?: string | undefined, files?: string | undefined }): Stores {
  return {
    cluster: clusterOf(given.cluster),
    database: kindOf(given.db, STORE_DATABASES, DEFAULT_DATABASE, 'a database'),
    files: kindOf(given.files, STORE_FILES, DEFAULT_FILES, 'a storage for files'),
  }
}
