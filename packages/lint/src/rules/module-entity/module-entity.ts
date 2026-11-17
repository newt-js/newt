import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import type { TSESTree }                          from '@typescript-eslint/utils'
import { default as ts }                          from 'typescript'
// --------------------------------------------------------
import { importedAs }                             from '../../ast/ast'
import { modulePlace }                            from '../../paths/paths'
import { rootOf }                                 from '../../paths/paths'

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression

/** `Entity`, `core.Entity`, or the name `Entity` is imported under. */
function extendsEntity(node: ClassNode, entities: Set<string>): boolean {
  const parent = node.superClass
  if (parent?.type === 'Identifier') return entities.has(parent.name)
  return parent?.type === 'MemberExpression' && !parent.computed && parent.property.type === 'Identifier' && parent.property.name === 'Entity'
}

/** newt's own `Entity`, where its package is. */
const isNewtEntity = (symbol: ts.Symbol | undefined) => symbol?.getName() === 'Entity'
  && (symbol.declarations ?? []).some(declaration => /[/\\](@newt-js[/\\]core|packages[/\\]core)[/\\]/.test(declaration.getSourceFile().fileName))

/** Whether a class's chain of base classes, as TypeScript reads it, reaches newt's `Entity`, wherever each one is declared. */
function reachesEntity(type: ts.Type, seen = new Set<ts.Type>()): boolean {
  if (seen.has(type)) return false
  seen.add(type)
  // A generic base, `Root<S>`, is a reference to its class, whose own bases TypeScript keeps.
  const declared = (type as ts.TypeReference).target ?? type
  return (declared.getBaseTypes() ?? []).some(base => isNewtEntity(base.getSymbol()) || reachesEntity(base, seen))
}

/**
 * A module keeps one entity, the root of its aggregate: only its `<m>.ts` declares a class
 * that extends `Entity`, and only one. Another entity is a module of its own, which this
 * one references by its id.
 */
export const moduleEntity: TSESLint.RuleModule<'elsewhere' | 'second'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A module keeps one entity, in its <m>.ts.' },
    messages: {
      elsewhere: "'{{name}}' is an entity outside {{module}}.ts: a module keeps one entity, its own. Another entity is a module of its own (newt add module), which this one references by its id.",
      second: "'{{name}}' is a second entity of {{module}}: a module keeps one. Make it a module of its own (newt add module), which this one references by its id.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place || /\.test\.tsx?$/.test(place.inside)) return {}
    const ownFile = place.inside === `${place.module}.ts`
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    let entities = new Set<string>()
    let found = 0
    const isEntity = (node: ClassNode) => {
      if (extendsEntity(node, entities)) return true
      if (!checker || !map || !node.superClass) return false
      return reachesEntity(checker.getTypeAtLocation(map.get(node)))
    }
    const check = (node: ClassNode) => {
      if (!isEntity(node)) return
      found++
      const name = node.id?.name ?? 'an anonymous class'
      if (!ownFile) {
        context.report({ node: node.id ?? node, messageId: 'elsewhere', data: { name, module: place.module } })
      } else if (found > 1) {
        context.report({ node: node.id ?? node, messageId: 'second', data: { name, module: place.module } })
      }
    }
    return {
      Program: program => {
        entities = importedAs(program, 'Entity')
      },
      ClassDeclaration: check,
      ClassExpression: check,
    }
  },
}
