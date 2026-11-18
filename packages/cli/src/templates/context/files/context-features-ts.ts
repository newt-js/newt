import type { ContextNames } from '../../../names/context-names/context-names'

/** <ctx>-features.ts: the context's features, each built after those it uses, which it is given. */
export function contextFeaturesTs({ type, camel }: ContextNames): string {
  return `import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'

export function ${camel}Features(base: ContextBase, router: HttpRouter) {
  return {
  }
}

export type ${type}Features = ReturnType<typeof ${camel}Features>
`
}
