import { TSESLint }      from '@typescript-eslint/utils'
import { TSESTree }      from '@typescript-eslint/utils'
import { posix }         from 'node:path'
// --------------------------------------------------------
import { extendsModule } from '../../ast/ast'
import { importedAs }    from '../../ast/ast'
import { slashed }       from '../../paths/paths'

/** Which use case does what with a module's files, and the one call that says it does. */
const PAIRS = [
  { useCase: 'uploadStart', call: 'uploadUrl' },
  { useCase: 'uploadConfirm', call: 'verifyUpload' },
  { useCase: 'downloadUrl', call: 'signedUrl' },
]
const CALLS = new Map(PAIRS.map(pair => [pair.call, pair.useCase]))

const capitalized = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`

/** `uploadStart` or, for a module with several kinds of file, `avatarUploadStart`. */
const isNamed = (method: string, useCase: string) => method === useCase || method.endsWith(capitalized(useCase))

/** What a member is called, when it is written with a name: `files.uploadUrl`, `files['uploadUrl']`. */
function memberName(property: TSESTree.Node, computed: boolean): string | undefined {
  if (!computed) return property.type === 'Identifier' ? property.name : undefined
  return property.type === 'Literal' && typeof property.value === 'string' ? property.value : undefined
}

/**
 * What a module does with its files reads the same in every module: `uploadUrl` is called
 * by `uploadStart`, `verifyUpload` by `uploadConfirm` and `signedUrl` by `downloadUrl`,
 * each by that method of the module itself, never by a helper or a service; and those use
 * cases call them, so an upload is never confirmed unverified. A prefix tells apart the
 * kinds of file of one module (`avatarUploadStart`). It reads names, not types.
 */
export const useCaseFiles: TSESLint.RuleModule<'wrongName' | 'outside' | 'missing'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'What a module does with its files is done by the use cases named after it.' },
    messages: {
      wrongName: "'{{call}}' is called by '{{method}}': move it to the use case '{{useCase}}' (or '<kind>{{capitalized}}'), so every module reads the same.",
      outside: "'{{call}}' is called outside a module's method: move it to the use case '{{useCase}}' of the module.",
      missing: "'{{method}}' never calls '{{call}}': a use case named so does it itself, or an upload could be confirmed unverified.",
    },
    schema: [],
  },
  create(context) {
    const file = posix.basename(slashed(context.filename))
    if (/\.test\.tsx?$/.test(file)) return {}
    const isModuleFile = file.endsWith('.module.ts')
    const modules = importedAs(context.sourceCode.ast, 'Module')
    /** The methods of a module being read, the innermost last. */
    const methods: { node: TSESTree.MethodDefinition, name: string, calls: Set<string> }[] = []

    const seen = (node: TSESTree.Node, call: string) => {
      const useCase = CALLS.get(call)
      if (!useCase) return
      const method = methods.at(-1)
      if (!method) {
        context.report({ node, messageId: 'outside', data: { call, useCase } })
      } else if (isNamed(method.name, useCase)) {
        method.calls.add(call)
      } else {
        context.report({ node, messageId: 'wrongName', data: { call, method: method.name, useCase, capitalized: capitalized(useCase) } })
      }
    }

    const isModuleMethod = (node: TSESTree.MethodDefinition) => {
      if (!isModuleFile || node.kind !== 'method' || node.key.type !== 'Identifier') return false
      const owner = node.parent.parent
      return (owner.type === 'ClassDeclaration' || owner.type === 'ClassExpression') && extendsModule(owner, modules)
    }

    return {
      MethodDefinition(node) {
        if (isModuleMethod(node)) methods.push({ node, name: (node.key as TSESTree.Identifier).name, calls: new Set() })
      },
      'MethodDefinition:exit'(node: TSESTree.MethodDefinition) {
        if (methods.at(-1)?.node !== node) return
        const { name, calls } = methods.pop()!
        const pair = PAIRS.find(each => isNamed(name, each.useCase))
        if (pair && !calls.has(pair.call)) context.report({ node: node.key, messageId: 'missing', data: { method: name, call: pair.call } })
      },
      MemberExpression(node) {
        const name = memberName(node.property, node.computed)
        if (name) seen(node.property, name)
      },
      'ObjectPattern > Property'(node: TSESTree.Property) {
        const name = memberName(node.key, node.computed)
        if (name) seen(node.key, name)
      },
    }
  },
}
