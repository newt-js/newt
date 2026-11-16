import type { FileChange }    from '../../commands/command'
import type { ChangeOutcome } from '../change-outcome'
import { completeJson }       from '../complete-json/complete-json'
import { createFile }         from '../create-file/create-file'
import { ensureLines }        from '../ensure-lines/ensure-lines'
import { removeJsonKey }      from '../remove-json-key/remove-json-key'
import { removeUnchanged }    from '../remove-unchanged/remove-unchanged'
import type { VirtualFiles }  from '../virtual-files/virtual-files'

export function applyChange(change: FileChange, files: VirtualFiles): Promise<ChangeOutcome> {
  switch (change.action) {
    case 'create': return createFile(change.path, change.content, files)
    case 'complete-json': return completeJson(change.path, change.values, files)
    case 'ensure-lines': return ensureLines(change.path, change.lines, files)
    case 'remove-unchanged': return removeUnchanged(change, files)
    case 'remove-json-key': return removeJsonKey(change, files)
  }
}
