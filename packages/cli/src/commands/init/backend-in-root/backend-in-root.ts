import { basename }     from 'node:path'
import { isAbsolute }   from 'node:path'
import { normalize }    from 'node:path'
// --------------------------------------------------------
import { checkedName }  from '../../../names/checked-name/checked-name'
import { CommandError } from '../../command-error/command-error'

/** The folder of the monorepo's first backend, inside its root. */
export function backendInRoot(given: string): string {
  const folder = normalize(given).replace(/\/$/, '')
  if (isAbsolute(folder) || folder === '.' || folder.startsWith('..')) {
    throw new CommandError(`--backend ${given} is not a folder inside the monorepo, as apps/api is`)
  }
  checkedName(basename(folder))
  return folder
}
