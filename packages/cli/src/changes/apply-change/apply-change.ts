import type { FileChange }         from '../../commands/command'
import { addClassMember }          from '../add-class-member/add-class-member'
import { addConstructorStatement } from '../add-constructor-statement/add-constructor-statement'
import { addObjectProperty }       from '../add-object-property/add-object-property'
import { appendBlock }             from '../append-block/append-block'
import type { ChangeOutcome }      from '../change-outcome'
import { completeEnv }             from '../complete-env/complete-env'
import { completeJson }            from '../complete-json/complete-json'
import { createFile }              from '../create-file/create-file'
import { ensureLines }             from '../ensure-lines/ensure-lines'
import { insertLines }             from '../insert-lines/insert-lines'
import { orderModules }            from '../order-modules/order-modules'
import { removeJsonKey }           from '../remove-json-key/remove-json-key'
import { removeUnchanged }         from '../remove-unchanged/remove-unchanged'
import { replaceLine }             from '../replace-line/replace-line'
import type { VirtualFiles }       from '../virtual-files/virtual-files'
import { wireModule }              from '../wire-module/wire-module'

export function applyChange(change: FileChange, files: VirtualFiles): Promise<ChangeOutcome> {
  switch (change.action) {
    case 'create': return createFile(change.path, change.content, files)
    case 'complete-json': return completeJson(change.path, change.values, files)
    case 'ensure-lines': return ensureLines(change.path, change.lines, files)
    case 'remove-unchanged': return removeUnchanged(change, files)
    case 'remove-json-key': return removeJsonKey(change, files)
    case 'complete-env': return completeEnv(change.path, change.variables, files)
    case 'insert-lines': return insertLines(change, files)
    case 'replace-line': return replaceLine(change, files)
    case 'add-class-member': return addClassMember(change, files)
    case 'add-object-property': return addObjectProperty(change, files)
    case 'append-block': return appendBlock(change, files)
    case 'order-modules': return orderModules(change.path, files)
    case 'wire-module': return wireModule(change, files)
    case 'add-constructor-statement': return addConstructorStatement(change, files)
  }
}
