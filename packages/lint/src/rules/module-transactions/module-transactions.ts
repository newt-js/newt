import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils'
import { TSESLint }                               from '@typescript-eslint/utils'
import { TSESTree }                               from '@typescript-eslint/utils'

const NAME = 'transactions'

/** `x.transactions`, `x['transactions']` or `{ transactions } = x`: the node whose type says what it is. */
function accessed(node: TSESTree.MemberExpression | TSESTree.Property): TSESTree.Node | undefined {
  if (node.type === 'MemberExpression') {
    const named = !node.computed && node.property.type === 'Identifier' ? node.property.name : node.property.type === 'Literal' ? node.property.value : undefined
    return named === NAME ? node : undefined
  }
  if (node.parent.type !== 'ObjectPattern') return undefined
  const named = node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? node.key.value : undefined
  return named === NAME ? node.value : undefined
}

/**
 * A module writes through its repository's `persist`, which runs the transaction,
 * checks the write rule and publishes the events: never in a transaction of its own
 * from its base's `transactions`. A field of its own named so, as the repository of a
 * module `transaction`, is no transaction: its type tells them apart.
 */
export const moduleTransactions: TSESLint.RuleModule<'own'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: "A module never opens a transaction of its own from its base's transactions." },
    messages: {
      own: "A module writes through its repository's persist, which runs the transaction, checks the write rule and publishes the events: never in a transaction of its own.",
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices as Partial<ParserServicesWithTypeInformation> | undefined
    const checker = services?.program?.getTypeChecker()
    const map = services?.esTreeNodeToTSNodeMap
    const isTransactions = (node: TSESTree.Node) => {
      if (!checker || !map) return true
      const type = checker.getTypeAtLocation(map.get(node))
      return (type.aliasSymbol ?? type.getSymbol())?.getName() === 'Transactions'
    }
    const check = (node: TSESTree.MemberExpression | TSESTree.Property) => {
      const found = accessed(node)
      if (found && isTransactions(found)) context.report({ node, messageId: 'own' })
    }
    return { MemberExpression: check, Property: check }
  },
}
