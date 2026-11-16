export const SRC_CONTEXTS_TS = `import type { Platform } from '@newt-js/core/application'
import type { ContextToRun } from '@newt-js/core/http'

export async function openContexts(platform: Platform): Promise<ContextToRun[]> {
  const contexts: ContextToRun[] = []
  return contexts
}
`
