/** src/contexts/contexts.ts: the contexts the backend opens, each one added by newt add context. */
export const SRC_CONTEXTS_TS = `import type { DataPlace, Platform } from '@newt-js/core/application'
import type { ContextToRun } from '@newt-js/core/http'

export async function openContexts(platform: Platform, place: DataPlace): Promise<ContextToRun[]> {
  const contexts: ContextToRun[] = []
  return contexts
}
`
