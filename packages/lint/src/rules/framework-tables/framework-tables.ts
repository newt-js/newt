import { TSESLint } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/utils'
// --------------------------------------------------------
import { textOf }   from '../../ast/ast'

/** The prefix of newt's tables. */
export const PREFIX = 'newt_'

/** The calls that name a table by their first argument: a database's `records`. */
const NAMING = new Set(['records'])

/** A table of newt's named in SQL: after `FROM`, `INTO`, `UPDATE`, `JOIN`, `TABLE` or `ON`, quoted or not, in a schema or not. */
const IN_SQL = /\b(?:from|into|update|join|on|table(?:\s+if\s+(?:not\s+)?exists)?)\s+(?:[`"[]?\w+[`"\]]?\s*\.\s*)?[`"[]?(newt_\w+)/i

/**
 * newt keeps what it needs in tables of its own in the context's database, every one
 * named `newt_…`: the outbox (`newt_job`), the schedules' ticks, the idempotency
 * keys, the migrations it applied. newt makes them, migrates them and reads them; an
 * application that named one would depend on what newt may change in any release, or
 * make a table of its own where newt's go. So no code names a table `newt_…`: not to
 * a database (`database.records('newt_job')`), nor in SQL.
 */
export const frameworkTables: TSESLint.RuleModule<'reserved'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'An application never names a table of newt\'s: those named newt_….' },
    messages: {
      reserved: "`{{name}}` is newt's, which newt makes, migrates and reads: an application never names a table `newt_…`. Name your own tables without that prefix, and ask newt what it keeps through its API.",
    },
    schema: [],
  },
  create(context) {
    const report = (node: TSESTree.Node, name: string) => context.report({ node, messageId: 'reserved', data: { name } })
    const inSql = (node: TSESTree.Node, text: string) => {
      const match = IN_SQL.exec(text)
      if (match) report(node, match[1]!)
    }
    return {
      CallExpression(node) {
        const { callee } = node
        const method = callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' ? callee.property.name : undefined
        if (method === undefined || !NAMING.has(method)) return
        const name = textOf(node.arguments[0])
        if (name?.startsWith(PREFIX)) report(node.arguments[0]!, name)
      },
      Literal(node) {
        if (typeof node.value === 'string') inSql(node, node.value)
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) inSql(quasi, quasi.value.cooked ?? '')
      },
    }
  },
}
