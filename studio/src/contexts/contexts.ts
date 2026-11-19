import type { DataPlace }    from '@newt-js/core/application'
import type { Platform }     from '@newt-js/core/application'
import type { ContextToRun } from '@newt-js/core/http'

export async function openContexts(
  platform: Platform,
  place: DataPlace,
): Promise<ContextToRun[]> {
  const contexts: ContextToRun[] = []
  return contexts
}
