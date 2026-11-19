import type { FeatureNames } from '../../../names/feature-names/feature-names'

/** The class of a feature, `Contacts_Feature`. */
export const featureClass = ({ type }: FeatureNames) => `${type}_Feature`

/** The head of the initialize of <feature>.feature.ts: without the features it uses, and with them. */
export function initializeHead(names: FeatureNames, withUses: boolean): string {
  const uses = withUses ? `    uses: ${names.type}_Uses,\n` : ''
  return `  static initialize(\n    base: ContextBase,\n    router: HttpRouter,\n${uses}  ): ${featureClass(names)} {`
}

/** The line of <feature>.feature.ts that opens the type of the features it uses. */
export const usesHead = ({ type }: FeatureNames) => `export type ${type}_Uses = {`

/** The line of <feature>.feature.ts that opens its class, above which goes the type of what it uses. */
export const classHead = (names: FeatureNames) => `export class ${featureClass(names)} extends Feature {`

/** The type of the features a feature uses, with none yet. */
export function usesTs(names: FeatureNames): string[] {
  return [usesHead(names), '}', '']
}

/** <feature>.feature.ts: the feature's class, which builds its modules and holds each one in a field. */
export function featureTs(names: FeatureNames): string {
  return `import { Feature } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { HttpRouter } from '@newt-js/core/http'

${classHead(names)}
${initializeHead(names, false)}
    return new ${featureClass(names)}(base, {})
  }

  private constructor(
    base: ContextBase,
    modules: {},
  ) {
    super('${names.camel}', base, modules)
  }
}
`
}

/** features/<feature>/index.ts: what the other features of its context can import of it. */
export function featureIndexTs(names: FeatureNames): string {
  return `export { ${featureClass(names)} } from './${names.folder}.feature'
`
}
