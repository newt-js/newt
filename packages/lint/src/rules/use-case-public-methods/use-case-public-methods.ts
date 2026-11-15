import { TSESLint }      from '@typescript-eslint/utils'
import { TSESTree }      from '@typescript-eslint/utils'
import { posix }         from 'node:path'
// --------------------------------------------------------
import { extendsModule } from '../../ast/ast'
import { importedAs }    from '../../ast/ast'
import { isHidden }      from '../../ast/ast'
import { isUseCase }     from '../../ast/ast'
import { slashed }       from '../../paths/paths'

function nameOf(member: TSESTree.MethodDefinition | TSESTree.PropertyDefinition): string {
  if (member.key.type === 'Identifier') return member.key.name
  return member.key.type === 'Literal' ? String(member.key.value) : '[computed]'
}

/**
 * A member anyone holding the module may call: neither private, protected, `#`, static,
 * nor the constructor or an accessor. A field counts when it holds a function, or what a
 * call returns (`this.run.bind(this)`, `wrap(async () => …)`).
 */
function isPublicCall(member: TSESTree.ClassElement): member is TSESTree.MethodDefinition | TSESTree.PropertyDefinition {
  if (member.type !== 'MethodDefinition' && member.type !== 'PropertyDefinition') return false
  if (member.static || isHidden(member)) return false
  if (member.type === 'MethodDefinition') return member.kind === 'method' && member.value.type !== 'TSEmptyBodyFunctionExpression'
  return member.value !== null && ['ArrowFunctionExpression', 'FunctionExpression', 'CallExpression'].includes(member.value.type)
}

/** The field a constructor parameter declares, when it is a public function: `public readonly place: () => Promise<void>`. */
function publicCallParameter(parameter: TSESTree.Parameter): TSESTree.Identifier | undefined {
  if (parameter.type !== 'TSParameterProperty') return undefined
  if (parameter.accessibility === 'private' || parameter.accessibility === 'protected') return undefined
  if (parameter.accessibility !== 'public' && !parameter.readonly) return undefined
  const binding = parameter.parameter.type === 'AssignmentPattern' ? parameter.parameter.left : parameter.parameter
  return binding.type === 'Identifier' && binding.typeAnnotation?.typeAnnotation.type === 'TSFunctionType' ? binding : undefined
}

/**
 * Every public method of a module is a use case: in a `*.module.ts`, a class that extends
 * `Module` marks each method it offers with `@UseCase`, which runs it as one (the write
 * rule, the retry on a conflict, its trace). A method that is not one is `private`. A
 * function in a public field, or in a public constructor parameter, is refused too,
 * since it cannot be decorated.
 */
export const useCasePublicMethods: TSESLint.RuleModule<'method' | 'field'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'Every public method of a module is a use case, marked @UseCase.' },
    messages: {
      method: "'{{name}}' is a public method of {{module}} without @UseCase: whatever a module offers is a use case. Mark it @UseCase(), or make it private if only the module calls it.",
      field: "'{{name}}' is a public function of {{module}} in a field, which @UseCase cannot mark: make it a method with @UseCase(), or make it private.",
    },
    schema: [],
  },
  create(context) {
    if (!posix.basename(slashed(context.filename)).endsWith('.module.ts')) return {}
    const modules = importedAs(context.sourceCode.ast, 'Module')
    const useCases = importedAs(context.sourceCode.ast, 'UseCase')
    const check = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
      if (!extendsModule(node, modules)) return
      const module = node.id?.name ?? 'this module'
      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition' && member.kind === 'constructor') {
          for (const binding of member.value.params.map(publicCallParameter)) {
            if (binding) context.report({ node: binding, messageId: 'field', data: { name: binding.name, module } })
          }
        }
        if (!isPublicCall(member)) continue
        if (member.type === 'PropertyDefinition') {
          context.report({ node: member.key, messageId: 'field', data: { name: nameOf(member), module } })
        } else if (!member.decorators.some(decorator => isUseCase(decorator, useCases))) {
          context.report({ node: member.key, messageId: 'method', data: { name: nameOf(member), module } })
        }
      }
    }
    return { ClassDeclaration: check, ClassExpression: check }
  },
}
