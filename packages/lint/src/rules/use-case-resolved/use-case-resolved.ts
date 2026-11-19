import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import { TSESTree }                               from '@typescript-eslint/utils'
import { posix }                                  from 'node:path'
import { default as ts }                          from 'typescript'
// --------------------------------------------------------
import { extendsModule }                          from '../../ast/ast'
import { importedAs }                             from '../../ast/ast'
import { isUseCase }                              from '../../ast/ast'
import { slashed }                                from '../../paths/paths'

/** How deep into what a use case returns the rule looks: an entity, its lists, the entities resolved in them. */
const DEPTH = 6

/** Whether a type is an id made with `uuidFactory`, or any other branded string: `string & z.$brand<'ProjectId'>`. */
function isBrandedString(type: ts.Type): boolean {
  return type.isIntersection()
    && type.types.some(each => (each.flags & ts.TypeFlags.String) !== 0)
    && type.types.some(each => (each.flags & ts.TypeFlags.Object) !== 0)
}

/** The ids, by their path, that a type keeps of another entity: `<name>Id` fields that are branded, but not its own `id`'s type. */
function storedIds(checker: ts.TypeChecker, type: ts.Type, path: string, depth: number, seen: Set<ts.Type>): string[] {
  if (depth > DEPTH || seen.has(type)) return []
  const inner = new Set([...seen, type])
  if (type.isUnion()) return [...new Set(type.types.flatMap(each => storedIds(checker, each, path, depth, inner)))]
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    return checker.getTypeArguments(type as ts.TypeReference).flatMap(each => storedIds(checker, each, `${path}[]`, depth + 1, inner))
  }
  // An object, or several joined (`z.infer<typeof OrderSchema> & { version: number }`); never an id, nor a function.
  if (isBrandedString(type) || ((type.flags & ts.TypeFlags.Object) === 0 && !type.isIntersection()) || type.getCallSignatures().length > 0) return []
  const own = type.getProperty('id')
  const ownId = own && checker.getNonNullableType(checker.getTypeOfSymbol(own))
  return type.getProperties().flatMap(property => {
    const name = property.getName()
    const value = checker.getNonNullableType(checker.getTypeOfSymbol(property))
    const at = path ? `${path}.${name}` : name
    if (name !== 'id' && name.endsWith('Id') && isBrandedString(value) && value !== ownId) return [at]
    return storedIds(checker, value, at, depth + 1, inner)
  })
}

/**
 * A use case returns the entity resolved: in place of an id it keeps of another entity (`projectId`, a
 * `uuidFactory` id), the entity it names (`project`), as the entity's `toDTO()` shows it once its references
 * are declared and its repository loads them. With the program
 * typescript-eslint builds, it looks into what every `@UseCase` of a module returns, through its lists, its
 * pages and the entities resolved in them. An id of its own entity's kind (a task's `parentId`) and a plain
 * `string` (an id of another system) are no reference.
 */
export const useCaseResolved: TSESLint.RuleModule<'stored'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A use case returns the entities its ids reference, never the ids it keeps.' },
    messages: {
      stored: "'{{useCase}}' returns '{{field}}', an id it keeps of another entity: return the entity's DTO, which shows the entity it names. Declare it among the entity's references, and give its repository how it loads.",
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.module.ts')) return {}
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    if (!checker || !map) return {}

    const check = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
      if (!extendsModule(node, importedAs(context.sourceCode.ast, 'Module'))) return
      const useCases = importedAs(context.sourceCode.ast, 'UseCase')
      for (const member of node.body.body) {
        if (member.type !== 'MethodDefinition' || !member.decorators.some(decorator => isUseCase(decorator, useCases))) continue
        const signature = checker.getSignatureFromDeclaration(map.get(member.value) as ts.SignatureDeclaration)
        if (!signature) continue
        const returned = checker.getAwaitedType(checker.getReturnTypeOfSignature(signature))
        if (!returned) continue
        const useCase = member.key.type === 'Identifier' ? member.key.name : '[computed]'
        for (const field of storedIds(checker, returned, '', 0, new Set())) {
          context.report({ node: member.key, messageId: 'stored', data: { useCase, field } })
        }
      }
    }
    return { ClassDeclaration: check, ClassExpression: check }
  },
}
