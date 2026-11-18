/** src/contexts/contexts.ts: the contexts the backend opens, each one added by newt add context. */
export const SRC_CONTEXTS_TS = `import type { Platform } from '@newt-js/core/application'
import type { ContextToRun } from '@newt-js/core/http'
import type { Stores } from '../stores'

export async function openContexts(platform: Platform, stores: Stores): Promise<ContextToRun[]> {
  const contexts: ContextToRun[] = []
  return contexts
}
`
