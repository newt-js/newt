import { TSESLint }      from '@typescript-eslint/utils'
import { TSESTree }      from '@typescript-eslint/utils'
// --------------------------------------------------------
import { extendsModule } from '../../ast/ast'
import { importedAs }    from '../../ast/ast'
import { textOf }        from '../../ast/ast'
import { camelCase }     from '../../paths/paths'
import { modulePlace }   from '../../paths/paths'
import { rootOf }        from '../../paths/paths'

/** The calls that define a name of a module's: its schedules and its rate limits (`base.schedules.define('…', …)`). */
const DEFINES = new Set(['schedules', 'rateLimits'])

/**
 * A module goes by its folder's name in camelCase: the name it gives `super`, and the
 * start of its events', schedules' and rate limits' names, which its use cases and its
 * workers' queues are named after. Written by hand, it could say another module.
 */
export const moduleNames: TSESLint.RuleModule<'module' | 'name'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A module is named after its folder, in camelCase.' },
    messages: {
      module: "This module is {{expected}}, after its folder: super('{{expected}}', …), not '{{found}}'.",
      name: "Name it '{{expected}}.<name>', after its folder, not '{{found}}'.",
    },
    schema: [],
  },
  create(context) {
    const place = modulePlace(context.filename, rootOf(context))
    if (!place) return {}
    const expected = camelCase(place.module)
    const program = context.sourceCode.ast
    const modules = importedAs(program, 'Module')
    const events = importedAs(program, 'defineEvent')
    // A test may name a throwaway event or schedule as it likes.
    const inTest = place.inside.endsWith('.test.ts')
    const named = (node: TSESTree.Node | undefined) => {
      if (inTest) return
      const found = textOf(node)
      if (node && found !== undefined && !found.startsWith(`${expected}.`)) context.report({ node, messageId: 'name', data: { found, expected } })
    }
    const checkClass = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
      if (!extendsModule(node, modules)) return
      for (const member of node.body.body) {
        if (member.type !== 'MethodDefinition' || member.kind !== 'constructor') continue
        for (const statement of member.value.body?.body ?? []) {
          const call = statement.type === 'ExpressionStatement' ? statement.expression : undefined
          if (call?.type !== 'CallExpression' || call.callee.type !== 'Super') continue
          const found = textOf(call.arguments[0])
          if (found !== undefined && found !== expected) context.report({ node: call.arguments[0]!, messageId: 'module', data: { expected, found } })
        }
      }
    }
    return {
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
      CallExpression(node) {
        const { callee } = node
        if (callee.type === 'Identifier' && events.has(callee.name)) {
          named(node.arguments[0])
          return
        }
        if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier' || callee.property.name !== 'define') return
        const owner = callee.object
        if (owner.type === 'MemberExpression' && !owner.computed && owner.property.type === 'Identifier' && DEFINES.has(owner.property.name)) named(node.arguments[0])
      },
    }
  },
}
