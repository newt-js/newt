import { CommandError }      from '../../commands/command-error/command-error'
import { DATABASES }         from '../../templates/context/databases'
import type { DatabaseName } from '../../templates/context/databases'

export const DEFAULT_DATABASE: DatabaseName = 'sqlite'

const isDatabase = (name: string): name is DatabaseName => Object.hasOwn(DATABASES, name)

export function databaseOf(given: string | undefined): DatabaseName {
  if (given === undefined) return DEFAULT_DATABASE
  if (!isDatabase(given)) {
    throw new CommandError(`'${given}' is not a database: ${Object.keys(DATABASES).join(', ')}`)
  }
  return given
}
