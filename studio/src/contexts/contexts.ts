import type { DataPlace }     from '@newt-js/core/application'
import type { Platform }      from '@newt-js/core/application'
import type { ContextToRun }  from '@newt-js/core/http'
// --------------------------------------------------------
import { Auth_Context }       from './auth/auth.context'
import { Backoffice_Context } from './backoffice/backoffice.context'
import { Panel_Context }      from './panel/panel.context'

export async function openContexts(
  platform: Platform,
  place: DataPlace,
): Promise<ContextToRun[]> {
  const auth = await Auth_Context.open(platform, place)
  const panel = await Panel_Context.open(platform, place)
  const backoffice = await Backoffice_Context.open(platform, place)
  return [auth, panel, backoffice]
}
