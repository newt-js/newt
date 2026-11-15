import { TSESLint } from '@typescript-eslint/utils'
import { TSESTree } from '@typescript-eslint/utils'
// --------------------------------------------------------
import { isHidden } from '../../ast/ast'

/** What a repository extends: newt's. */
const REPOSITORIES = new Set(['Repository', 'BaseRepository'])

/**
 * A repository has no logic and no method of its own: what newt gives it (`persist`,
 * `find`, `count`, `paginate`, `purge`) is all a use case calls. A class extending
 * `Repository` declares no public method, nor overrides one of them: what a module
 * decides is its use case's, which says it in `persist`'s hooks, and its entity's. It
 * says only how its rows are read and written, in the protected `toEntity`, `toRow` and
 * `toChanges`.
 */
export const repositoryPublicMethods: TSESLint.RuleModule<'method'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A repository declares no public method of its own.' },
    messages: {
      method: "'{{method}}' is a public method of the repository {{repository}}: a repository has only persist, find, count, paginate and purge. Say what it does in the use case (persist's hooks, criteria), or in the entity.",
    },
    schema: [],
  },
  create(context) {
    return {
      'ClassDeclaration > ClassBody > MethodDefinition'(member: TSESTree.MethodDefinition) {
        const owner = member.parent.parent as TSESTree.ClassDeclaration
        const parent = owner.superClass
        if (parent?.type !== 'Identifier' || !REPOSITORIES.has(parent.name)) return
        if (member.kind === 'constructor' || isHidden(member)) return
        const method = member.key.type === 'Identifier' ? member.key.name : context.sourceCode.getText(member.key)
        context.report({ node: member.key, messageId: 'method', data: { method, repository: owner.id?.name ?? 'class' } })
      },
    }
  },
}
