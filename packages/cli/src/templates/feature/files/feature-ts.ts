import type { FeatureNames } from '../../../names/feature-names/feature-names'

/** The line of <feature>.feature.ts that opens its function: without the features it uses, and with them. */
export function featureHead({ camel, type }: FeatureNames, withUses: boolean): string {
  return `export function ${camel}Feature(base: ContextBase, router: HttpRouter${withUses ? `, uses: ${type}Uses` : ''}) {`
}

/** The line of <feature>.feature.ts that opens the type of the features it uses. */
export const usesHead = ({ type }: FeatureNames) => `export type ${type}Uses = {`

/** The line of <feature>.feature.ts that tells its own type, above which goes the type of what it uses. */
export const featureType = ({ camel, type }: FeatureNames) => `export type ${type}Feature = ReturnType<typeof ${camel}Feature>`

/** The type of the features a feature uses, with none yet. */
export function usesTs(names: FeatureNames, context: string): string[] {
  return [`/** What ${names.camel} uses of the other features of ${context}, which ${context}-features.ts builds before it. */`, usesHead(names), '}', '']
}

/** <feature>.feature.ts: the feature's entry point, which builds its modules and returns its contract. */
export function featureTs(names: FeatureNames): string {
  return `import { defineFeature } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'

/** What the other features see of ${names.camel}: each module, with what it exposes. */
${featureHead(names, false)}
  return defineFeature('${names.camel}', base, {
  })
}

${featureType(names)}
`
}
