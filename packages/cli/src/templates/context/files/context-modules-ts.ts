import type { ContextNames } from '../../../names/context-names/context-names'

export function contextModulesTs({ type, camel }: ContextNames): string {
  return `import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'

export function ${camel}Modules(base: ContextBase, router: HttpRouter) {
  return {}
}

export type ${type}Modules = ReturnType<typeof ${camel}Modules>
`
}
