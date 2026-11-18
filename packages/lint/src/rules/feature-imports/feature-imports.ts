import { TSESLint }      from '@typescript-eslint/utils'
import { readFileSync }  from 'node:fs'
import { readdirSync }   from 'node:fs'
import { statSync }      from 'node:fs'
import { posix }         from 'node:path'
import { default as ts } from 'typescript'
// --------------------------------------------------------
import { absolute }      from '../../paths/paths'
import { featurePlace }  from '../../paths/paths'
import { importsOf }     from '../../paths/paths'
import { real }          from '../../paths/paths'
import { resolved }      from '../../paths/paths'
import { rootOf }        from '../../paths/paths'
import { target }        from '../../paths/paths'

export type FeatureImportsOptions = { folder: string }

/** What each feature of a context folder uses, kept while their entry points are as they were read. */
const declared = new Map<string, { stamp: string, uses: Record<string, string[]> }>()

/**
 * What each feature of the context in `folder` (absolute) uses: the other features whose
 * entry points its own entry point, `features/<f>/<f>.feature.ts`, imports. Read again
 * whenever one of those files changes.
 */
export function declaredFeatureUses(folder: string, contexts: string): Record<string, string[]> {
  const features = posix.join(real(folder), 'features')
  const names = statSync(features, { throwIfNoEntry: false })?.isDirectory()
    ? readdirSync(features, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    : []
  const files = names.map(name => posix.join(features, name, `${name}.feature.ts`))
  const stamp = files.map(file => statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0).join(' ')
  const known = declared.get(folder)
  if (known?.stamp === stamp) return known.uses
  const uses: Record<string, string[]> = {}
  names.forEach((name, at) => {
    const file = files[at]!
    const text = statSync(file, { throwIfNoEntry: false })?.isFile() ? readFileSync(file, 'utf8') : ''
    const imported = ts.preProcessFile(text, true, true).importedFiles.map(each => each.fileName).filter(specifier => specifier.startsWith('.'))
    const others = imported.map(specifier => featurePlace(target(file, specifier), contexts)).filter(other => other !== null && other.feature !== name)
    uses[name] = [...new Set(others.map(other => other!.feature))].sort()
  })
  declared.set(folder, { stamp, uses })
  return uses
}

/** A path of features from `from` to `to` through what each uses, `from` and `to` among them; `null` when `to` is not reached. */
function pathOf(uses: Record<string, string[]>, from: string, to: string, seen = new Set<string>()): string[] | null {
  if (from === to) return [to]
  if (seen.has(from)) return null
  seen.add(from)
  for (const next of uses[from] ?? []) {
    const rest = pathOf(uses, next, to, seen)
    if (rest) return [from, ...rest]
  }
  return null
}

/** That a path inside a feature is its entry point, `<feature>.feature.ts`, as an import names it: with or without its extension. */
const isEntryPoint = (inside: string, feature: string) => inside.replace(/\.[cm]?[jt]sx?$/, '') === `${feature}.feature`

/**
 * Features never use each other in a cycle, and a feature uses only those its entry point
 * imports: there it is given them (`uses`). A feature is reached from outside it only through its entry point,
 * `features/<feature>/<feature>.feature.ts`: what it returns is the feature's contract,
 * and what it re-exports (types, errors) is all another feature may name of it. Its
 * modules are its own, so they can be merged or split without breaking another feature.
 * The files of the context outside its features (its composition) import the entry
 * points alone too.
 */
export const featureImports: TSESLint.RuleModule<'inside' | 'undeclared' | 'cycle', [FeatureImportsOptions]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: 'Another feature is reached only through its entry point, <feature>.feature.ts, and features never use each other in a cycle.' },
    messages: {
      undeclared: "'{{path}}' is the feature {{feature}}'s, and {{own}}.feature.ts imports {{uses}}: a feature uses only the features its entry point imports, where it is given them. Import it there first, if {{own}} must use it.",
      cycle: "{{cycle}}: features never use each other in a cycle. Let one of them react to the other's events instead of calling it.",
      inside: "'{{path}}' is inside the feature {{feature}}: from outside it, import only its entry point, features/{{feature}}/{{feature}}.feature.ts, and reach its modules through the contract it returns ({{feature}}.<module>.<use case>). A type or an error another feature needs, its entry point re-exports.",
    },
    schema: [{
      type: 'object',
      properties: { folder: { type: 'string' } },
      required: ['folder'],
      additionalProperties: false,
    }],
  },
  create(context) {
    const folder = absolute(context.options[0].folder, rootOf(context))
    const own = featurePlace(context.physicalFilename, folder)
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      const imported = path && featurePlace(path, folder)
      if (!imported || (own && own.context === imported.context && own.feature === imported.feature)) return
      if (!isEntryPoint(imported.inside, imported.feature)) {
        context.report({ node, messageId: 'inside', data: { path: specifier, feature: imported.feature } })
        return
      }
      if (!own || own.context !== imported.context) return
      const uses = declaredFeatureUses(posix.join(folder, own.context), folder)
      const allowed = uses[own.feature] ?? []
      if (!allowed.includes(imported.feature)) {
        const data = { path: specifier, feature: imported.feature, own: own.feature, uses: allowed.length ? allowed.join(', ') : 'no other feature' }
        context.report({ node, messageId: 'undeclared', data })
        return
      }
      const back = pathOf(uses, imported.feature, own.feature)
      if (back && isEntryPoint(own.inside, own.feature)) {
        context.report({ node, messageId: 'cycle', data: { cycle: [own.feature, ...back].join(' → ') } })
      }
    })
  },
}
