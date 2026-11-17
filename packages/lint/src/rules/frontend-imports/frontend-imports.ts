import { TSESLint }   from '@typescript-eslint/utils'
import { isBuiltin }  from 'node:module'
// --------------------------------------------------------
import { fromNewt }   from '../../ast/ast'
import { isTypeOnly } from '../../ast/ast'
import { ROOT }       from '../../paths/paths'
import { absolute }   from '../../paths/paths'
import { contextOf }  from '../../paths/paths'
import { importsOf }  from '../../paths/paths'
import { real }       from '../../paths/paths'
import { resolved }   from '../../paths/paths'
import { rootOf }     from '../../paths/paths'
import { slashed }    from '../../paths/paths'

/** A frontend imports its own files, and only types from its context's schemas and from newt. */
export const frontendImports: TSESLint.RuleModule<'outside' | 'schema' | 'server' | 'runtime', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A frontend imports its own files and its context's schemas as types, never the server's code." },
    messages: {
      outside: "'{{path}}' is outside {{context}}'s frontend: a frontend imports its own files and, as types, its context's schemas, never the server's code.",
      schema: "'{{path}}' is a schema of {{context}}: import its types alone, `import type`, so the server's code never reaches the browser.",
      server: "'{{path}}' is newt's code, which runs in the server: a frontend imports only its types, `import type`.",
      runtime: "'{{path}}' is Bun's or Node's, which a browser has not: a frontend imports only its types, `import type`.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder: written }] = context.options
    const folder = real(absolute(written, rootOf(context)))
    const own = contextOf(context.physicalFilename, folder)
    if (!own || own === ROOT) return {}
    const frontend = `${folder}/${own}/frontend`
    if (!real(slashed(context.physicalFilename)).startsWith(`${frontend}/`)) return {}
    const schema = new RegExp(`^${folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${own}/modules/([^/]+)/\\1\\.schema$`)
    return importsOf((node, specifier) => {
      const path = resolved(context, specifier)
      const data = { path: specifier, context: own }
      if (/^(bun|node):/.test(specifier) || specifier === 'bun' || isBuiltin(specifier)) {
        if (!isTypeOnly(node)) context.report({ node, messageId: 'runtime', data })
        return
      }
      if (path === null) {
        if (fromNewt(specifier) && !isTypeOnly(node)) context.report({ node, messageId: 'server', data })
        return
      }
      const file = real(path)
      if (file.startsWith(`${frontend}/`)) return
      if (schema.test(file)) {
        if (!isTypeOnly(node)) context.report({ node, messageId: 'schema', data })
        return
      }
      context.report({ node, messageId: 'outside', data })
    })
  },
}
