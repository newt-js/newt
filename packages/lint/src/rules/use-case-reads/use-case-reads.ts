import { TSESLint }    from '@typescript-eslint/utils'
import { TSESTree }    from '@typescript-eslint/utils'
// --------------------------------------------------------
import { parameterOf } from '../../ast/ast'

/** The reads by criteria, and `get` by id: never by text. */
const BY_CRITERIA = new Set(['find', 'get', 'paginate'])

/** The name of the type a parameter is written with, when it is a plain reference (`SearchText`). */
function typeName(type: TSESTree.TypeNode | undefined): string | undefined {
  return type?.type === 'TSTypeReference' && type.typeName.type === 'Identifier' ? type.typeName.name : undefined
}

/**
 * A module reads in four ways, the same in every module: `find(criteria, sort?)`, the
 * list; `get(id)`, one by its id or a `NotFound`; `paginate(criteria, page, sort?)`, by pages;
 * and `search(text, page)`, by text, always by pages. In a `*.module.ts`, `find`, `get`
 * and `paginate` take no text (a parameter named `text`, or a `SearchText`), and `search`
 * takes exactly `(text, page)`.
 */
export const useCaseReads: TSESLint.RuleModule<'text' | 'search'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'find and paginate read by criteria, get by id; search reads by text, (text, page).' },
    messages: {
      text: "'{{method}}' never reads by text: a search by text is `search(text, page)`.",
      search: "'search' takes exactly `(text, page)`: the text, a `SearchText`, and a `PageRequest`. Criteria and an order are `find`'s and `paginate`'s.",
    },
    schema: [],
  },
  create(context) {
    if (!context.filename.endsWith('.module.ts')) return {}
    return {
      'ClassBody > MethodDefinition'(member: TSESTree.MethodDefinition) {
        if (member.kind !== 'method' || member.static || member.accessibility === 'private' || member.accessibility === 'protected' || member.key.type !== 'Identifier') return
        const method = member.key.name
        const parameters = member.value.params.map(parameterOf)
        if (BY_CRITERIA.has(method)) {
          const text = parameters.find(each => each.name === 'text' || typeName(each.type) === 'SearchText')
          if (text) context.report({ node: text.node, messageId: 'text', data: { method } })
          return
        }
        if (method === 'search') {
          const [text, page] = parameters
          if (parameters.length !== 2 || text?.name !== 'text' || page?.name !== 'page') context.report({ node: member.key, messageId: 'search' })
        }
      },
    }
  },
}
