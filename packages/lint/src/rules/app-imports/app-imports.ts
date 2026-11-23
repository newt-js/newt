import { TSESLint }        from '@typescript-eslint/utils'
import { isBuiltin }       from 'node:module'
// --------------------------------------------------------
import { fromNewt }        from '../../ast/ast'
import { isTypeOnly }      from '../../ast/ast'
import { ROOT }            from '../../paths/paths'
import { absolute }        from '../../paths/paths'
import { contextOf }       from '../../paths/paths'
import { importsOf }       from '../../paths/paths'
import { isModuleEntry }   from '../../paths/paths'
import { moduleOfContext } from '../../paths/paths'
import { real }            from '../../paths/paths'
import { resolved }        from '../../paths/paths'
import { rootOf }          from '../../paths/paths'
import { slashed }         from '../../paths/paths'

/** A context's app imports its own files, and only types from its context's modules (what their `index.ts` offers) and from newt. */
export const appImports: TSESLint.RuleModule<'outside' | 'module' | 'server' | 'runtime', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A context's app imports its own files and, as types, its context's modules, never the server's code." },
    messages: {
      outside: "'{{path}}' is outside {{context}}'s app: an app imports its own files and, as types, what its context's modules offer in their index.ts, by their folder. Never the server's code.",
      module: "'{{path}}' is a module of {{context}}: import its types alone, `import type`, so the server's code never reaches the browser.",
      server: "'{{path}}' is newt's code, which runs in the server: an app imports only its types, `import type`.",
      runtime: "'{{path}}' is Bun's or Node's, which a browser has not: an app imports only its types, `import type`.",
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder: written }] = context.options
    const folder = real(absolute(written, rootOf(context)))
    const own = contextOf(context.physicalFilename, folder)
    if (!own || own === ROOT) return {}
    const app = `${folder}/${own}/app`
    if (!real(slashed(context.physicalFilename)).startsWith(`${app}/`)) return {}
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
      if (file.startsWith(`${app}/`)) return
      const module = moduleOfContext(file, folder)
      if (module?.context === own && isModuleEntry(module.inside)) {
        if (!isTypeOnly(node)) context.report({ node, messageId: 'module', data })
        return
      }
      context.report({ node, messageId: 'outside', data })
    })
  },
}
