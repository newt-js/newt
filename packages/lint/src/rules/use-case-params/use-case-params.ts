import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import { TSESTree }                               from '@typescript-eslint/utils'
import { posix }                                  from 'node:path'
import { default as ts }                          from 'typescript'
// --------------------------------------------------------
import { extendsModule }                          from '../../ast/ast'
import { importedAs }                             from '../../ast/ast'
import { isUseCase }                              from '../../ast/ast'
import { nodes }                                  from '../../ast/ast'
import { parameterOf }                            from '../../ast/ast'
import { slashed }                                from '../../paths/paths'

/** Whether a type says nothing: `unknown` or `any`, alone or in a union (`unknown | undefined`). */
function saysNothing(type: TSESTree.TypeNode): boolean {
  if (type.type === 'TSUnknownKeyword' || type.type === 'TSAnyKeyword') return true
  return type.type === 'TSUnionType' && type.types.some(saysNothing)
}

const PARSES = new Set(['parse', 'safeParse', 'parseAsync', 'safeParseAsync'])

/**
 * The schema a DTO is the input of, by what TypeScript says of its alias:
 * `type BoardCreateDTO = z.input<typeof BoardCreateSchema>` gives `BoardCreateSchema`.
 * `undefined` for any other type: an entity's DTO (`z.infer`), a page request, an id.
 */
function inputSchemaOf(checker: ts.TypeChecker, reference: ts.Node): string | undefined {
  if (!ts.isTypeReferenceNode(reference)) return undefined
  let symbol = checker.getSymbolAtLocation(reference.typeName)
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
  for (const declaration of symbol?.declarations ?? []) {
    if (!ts.isTypeAliasDeclaration(declaration) || !ts.isTypeReferenceNode(declaration.type)) continue
    const written = declaration.type.typeName.getText()
    if (written !== 'input' && !written.endsWith('.input')) continue
    const query = declaration.type.typeArguments?.[0]
    if (query && ts.isTypeQueryNode(query)) return query.exprName.getText()
  }
  return undefined
}

/**
 * A use case's inputs say what a caller sends, and are checked all the same: no parameter
 * of a `@UseCase` is typed `unknown` or `any`, nor with an object written in place, which
 * belongs in the module's schema as a DTO. A single attribute, as an id, is a plain
 * `string` or `number`. With the program typescript-eslint builds, a parameter typed
 * with an input DTO (`z.input<typeof XSchema>`) is parsed with that schema in the use
 * case, or in a private method of the module it hands it to.
 */
export const useCaseParams: TSESLint.RuleModule<'nothing' | 'inline' | 'unparsed'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A use case's parameters are attributes or DTOs of its schema, and its input DTOs are parsed with that schema." },
    messages: {
      nothing: "'{{name}}' of the use case '{{useCase}}' is typed as nothing: type it with a DTO of the module's schema (`z.input<typeof …Schema>`), and parse it with that schema.",
      inline: "'{{name}}' of the use case '{{useCase}}' is an object written in place: name it in the module's schema as a DTO (`z.input<typeof …Schema>`), and parse it with that schema.",
      unparsed: "'{{name}}' of the use case '{{useCase}}' is a {{type}}, the input of {{schema}}, but nothing parses it: its type checks nothing at run time. Call `{{schema}}.parse({{name}})` first.",
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.module.ts')) return {}
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    const text = (node: TSESTree.Node) => context.sourceCode.getText(node)

    /** Whether `body` parses `name` with `schema`, or hands it to a private method of `methods` that does. */
    const parses = (body: TSESTree.Node, name: string, schema: string, methods: Map<string, TSESTree.MethodDefinition>, seen: Set<string>): boolean => {
      for (const node of nodes(body)) {
        if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.computed) continue
        const { object, property } = node.callee
        const hands = node.arguments.findIndex(argument => argument.type === 'Identifier' && argument.name === name)
        if (hands < 0 || property.type !== 'Identifier') continue
        if (PARSES.has(property.name) && text(object) === schema) return true
        const method = object.type === 'ThisExpression' ? methods.get(property.name) : undefined
        if (!method || seen.has(property.name)) continue
        const param = method.value.params[hands]
        const handed = param && parameterOf(param).name
        if (handed && method.value.body && parses(method.value.body, handed, schema, methods, new Set([...seen, property.name]))) return true
      }
      return false
    }

    const check = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
      if (!extendsModule(node, importedAs(context.sourceCode.ast, 'Module'))) return
      const useCases = importedAs(context.sourceCode.ast, 'UseCase')
      const privates = new Map<string, TSESTree.MethodDefinition>()
      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition' && member.key.type === 'Identifier' && member.accessibility === 'private') privates.set(member.key.name, member)
      }
      for (const member of node.body.body) {
        if (member.type !== 'MethodDefinition' || !member.decorators.some(decorator => isUseCase(decorator, useCases))) continue
        const useCase = member.key.type === 'Identifier' ? member.key.name : '[computed]'
        for (const parameter of member.value.params) {
          const { name, node: at, type } = parameterOf(parameter)
          const data = { name: name ?? text(at), useCase }
          if (!type || saysNothing(type)) {
            context.report({ node: at, messageId: 'nothing', data })
            continue
          }
          if (type.type === 'TSTypeLiteral') {
            context.report({ node: at, messageId: 'inline', data })
            continue
          }
          if (!checker || !map || !name || !member.value.body || type.type !== 'TSTypeReference') continue
          const schema = inputSchemaOf(checker, map.get(type))
          if (schema && !parses(member.value.body, name, schema, privates, new Set())) {
            context.report({ node: at, messageId: 'unparsed', data: { ...data, type: text(type), schema } })
          }
        }
      }
    }
    return { ClassDeclaration: check, ClassExpression: check }
  },
}
