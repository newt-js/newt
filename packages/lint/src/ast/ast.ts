import { TSESTree } from '@typescript-eslint/utils'

/** The package an application imports newt from. */
export const CORE = '@newt-js/core'

/** Whether an import comes from newt: `@newt-js/core`, or one of its entry points (`@newt-js/core/http`). */
export function fromNewt(source: string): boolean {
  return source === CORE || source.startsWith(`${CORE}/`)
}

/**
 * Whether the import or re-export whose path is `source` brings only types: `import type`,
 * every name marked `type`, `export type`, `import('…')` as a type, `import type x = require('…')`.
 */
export function isTypeOnly(source: TSESTree.Node): boolean {
  const parent = source.parent
  if (parent?.type === 'TSImportType') return true
  if (parent?.type === 'TSExternalModuleReference') return parent.parent.type === 'TSImportEqualsDeclaration' && parent.parent.importKind === 'type'
  if (parent?.type === 'ExportAllDeclaration') return parent.exportKind === 'type'
  if (parent?.type === 'ExportNamedDeclaration') {
    return parent.exportKind === 'type' || (parent.specifiers.length > 0 && parent.specifiers.every(each => each.exportKind === 'type'))
  }
  if (parent?.type !== 'ImportDeclaration') return false
  if (parent.importKind === 'type') return true
  return parent.specifiers.length > 0 && parent.specifiers.every(each => each.type === 'ImportSpecifier' && each.importKind === 'type')
}

/** Every node under `node`, itself included: it walks what holds a `type`, as ESLint's visitor keys would. */
export function* nodes(node: TSESTree.Node | null | undefined): Generator<TSESTree.Node> {
  if (!node || typeof node.type !== 'string') return
  yield node
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue
    if (Array.isArray(value)) {
      for (const each of value) yield* nodes(each as TSESTree.Node)
    } else if (value && typeof (value as { type?: unknown }).type === 'string') {
      yield* nodes(value as TSESTree.Node)
    }
  }
}

const TYPED = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion', 'TSNonNullExpression'])

/** A value without what only TypeScript sees around it: `'handler' as const`, `<const>'handler'` and `'handler'!` are `'handler'`. */
export function unwrap(node: TSESTree.Node | undefined): TSESTree.Node | undefined {
  return node && TYPED.has(node.type) ? unwrap((node as TSESTree.TSAsExpression).expression) : node
}

/** The string a value is written as: a string, or a template with nothing in it; else `undefined`. */
export function textOf(node: TSESTree.Node | undefined): string | undefined {
  const value = unwrap(node)
  if (value?.type === 'Literal') return typeof value.value === 'string' ? value.value : undefined
  return value?.type === 'TemplateLiteral' && value.expressions.length === 0 ? value.quasis[0]?.value.cooked ?? undefined : undefined
}

/** The names newt's `exported` goes by in a file: itself, and `Base` for `import { Module as Base }`. */
export function importedAs(program: TSESTree.Program, exported: string): Set<string> {
  const names = new Set([exported])
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || !fromNewt(statement.source.value)) continue
    for (const specifier of statement.specifiers) {
      const imported = specifier.type === 'ImportSpecifier' ? specifier.imported : undefined
      if (imported && (imported.type === 'Identifier' ? imported.name : imported.value) === exported) names.add(specifier.local.name)
    }
  }
  return names
}

/** `Module`, `core.Module`, or the name `Module` is imported under: the class a module extends. */
export function extendsModule(node: TSESTree.ClassDeclaration | TSESTree.ClassExpression, modules: Set<string>): boolean {
  const parent = node.superClass
  if (parent?.type === 'Identifier') return modules.has(parent.name)
  return parent?.type === 'MemberExpression' && !parent.computed && parent.property.type === 'Identifier' && parent.property.name === 'Module'
}

/** `@UseCase`, `@core.UseCase` or the name `UseCase` is imported under, called or not. */
export function isUseCase(decorator: TSESTree.Decorator, useCases: Set<string>): boolean {
  const expression = decorator.expression.type === 'CallExpression' ? decorator.expression.callee : decorator.expression
  if (expression.type === 'Identifier') return useCases.has(expression.name)
  return expression.type === 'MemberExpression' && !expression.computed && expression.property.type === 'Identifier' && expression.property.name === 'UseCase'
}

/** Whether a member is private or protected, by its keyword or by `#`. */
export function isHidden(member: TSESTree.MethodDefinition | TSESTree.PropertyDefinition): boolean {
  return member.accessibility === 'private' || member.accessibility === 'protected' || member.key.type === 'PrivateIdentifier'
}

/** A parameter's name and its type as written, through a default (`page = …`) and a parameter property; a pattern has no name. */
export function parameterOf(parameter: TSESTree.Parameter): { name: string | null, node: TSESTree.Node, type: TSESTree.TypeNode | undefined } {
  const inner = parameter.type === 'TSParameterProperty' ? parameter.parameter : parameter
  const binding = inner.type === 'AssignmentPattern' ? inner.left : inner
  const type = 'typeAnnotation' in binding ? binding.typeAnnotation?.typeAnnotation : undefined
  return { name: binding.type === 'Identifier' ? binding.name : null, node: binding, type }
}
