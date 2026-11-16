import { join }        from 'node:path'
// --------------------------------------------------------
import { ADD_CONTEXT } from '../../commands/add-context/add-context'
import { ADD_MODULE }  from '../../commands/add-module/add-module'
import { INIT }        from '../../commands/init/init'
import { runCommand }  from '../../run/run-command/run-command'
import { generate }    from '../generate/generate'

export const ORDER_MODULE = 'src/contexts/sales/modules/order'

/** A backend with a context, sales, and a module of it, order, as newt writes them. */
export async function moduleProject(): Promise<string> {
  const backend = join(await generate(INIT, ['shop']), 'shop')
  await runCommand(ADD_CONTEXT, ['sales'], { cwd: backend, ask: null })
  await runCommand(ADD_MODULE, ['sales/order'], { cwd: backend, ask: null })
  return backend
}
