import type { FeatureNames } from '../../../names/feature-names/feature-names'

/** <feature>.feature.ts: the feature's entry point, which builds its modules and returns its contract. */
export function featureTs({ camel, type }: FeatureNames): string {
  return `import { defineFeature } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'

/** What the other features see of ${camel}: each module, with what it exposes. */
export function ${camel}Feature(base: ContextBase, router: HttpRouter) {
  return defineFeature('${camel}', base, {
  })
}

export type ${type}Feature = ReturnType<typeof ${camel}Feature>
`
}
