import { TSESLint }   from '@typescript-eslint/utils'
import { posix }      from 'node:path'
// --------------------------------------------------------
import { isTypeOnly } from '../../ast/ast'
import { appPlaceOf } from '../../paths/paths'

/** What an app's root holds: its start, and one folder for each kind of piece. */
const ROOT_FILES = new Set(['main.tsx', 'app.tsx', 'app.routes.tsx', 'base.ts'])

const ROOT_FOLDERS = new Set(['components', 'services', 'guards', 'pages', 'features'])

/** The folders whose pieces live each in a folder of their own, named as it: `features/clients/clients-list.tsx`. */
const NAMED = new Set(['services', 'pages', 'features'])

/** What holds state or talks to the backend: never in pages/. */
const STATEFUL = /\.(service|state|api)\.ts$/

/** Who may reach Requester: an api file, and main.tsx, which sets where requests go when the app starts. */
const REQUESTS = /\.api\.ts$|^main\.tsx$/

const ROOT_LIST = 'main.tsx, app.tsx, app.routes.tsx, base.ts and the folders components/, services/, guards/, pages/ and features/'

/** A file's name before its first dot: `clients-list` of `clients-list.service.ts`. */
const stem = (file: string) => file.slice(0, file.indexOf('.') === -1 ? undefined : file.indexOf('.'))

/** The feature a path of the app is in: `clients` of `features/clients/clients.tsx`, or `null`. */
const featureOf = (path: string) => /^features\/([^/]+)/.exec(path)?.[1] ?? null

const isPrefixed = (name: string, folder: string) => name === folder || name.startsWith(`${folder}-`)

/**
 * A context's app keeps each thing in its place: at its root, its start and a folder per kind of piece; in
 * features/, pages/ and services/, a folder per piece, whose files and folders are named after it; pages/ holds
 * no state; only an api file talks to the backend (and main.tsx says where).
 */
export const appFiles: TSESLint.RuleModule<'root' | 'loose' | 'prefix' | 'pages' | 'requester' | 'feature', [{ folder: string }]> = {
  defaultOptions: [{ folder: 'src/contexts' }],
  meta: {
    type: 'problem',
    docs: { description: "A context's app keeps each thing in its place, named after where it lives." },
    messages: {
      root: "'{{inside}}' is not a place of {{context}}'s app: its root holds " + ROOT_LIST + '.',
      loose: "'{{inside}}' sits loose in {{top}}/: {{top}}/ holds a folder for each, `{{top}}/<name>/<name>.tsx`.",
      prefix: "'{{name}}' is in {{folder}}/: name it {{folder}} or {{folder}}-<part>, so where it lives is in its name.",
      pages: "'{{inside}}' holds state or talks to the backend: pages/ is the frame and the errors alone (shell, not-found); what shows the business is a feature, in features/.",
      feature: "'{{inside}}' imports the feature {{other}}: a feature never reaches into another. Let an event on the EventBus tell it, or move what both need to components/ or services/.",
      requester: 'Only an api file (`<name>.api.ts`, beside its service) talks to the backend: extend Requester there. main.tsx alone sets where requests go.',
    },
    schema: [{ type: 'object', properties: { folder: { type: 'string' } }, required: ['folder'], additionalProperties: false }],
  },
  create(context) {
    const [{ folder }] = context.options
    const place = appPlaceOf(context, folder)
    if (!place) return {}
    const { inside } = place
    const segments = inside.split('/')
    const [top = ''] = segments
    const file = segments.at(-1) ?? ''
    const mayRequest = REQUESTS.test(inside)
    return {
      Program(node) {
        const data = { inside, context: place.context, top }
        if (segments.length === 1) {
          if (!ROOT_FILES.has(file)) context.report({ node, messageId: 'root', data })
          return
        }
        if (!ROOT_FOLDERS.has(top)) return context.report({ node, messageId: 'root', data })
        if (top === 'pages' && STATEFUL.test(file)) context.report({ node, messageId: 'pages', data })
        if (!NAMED.has(top)) return
        if (segments.length === 2) return context.report({ node, messageId: 'loose', data })
        // Below the piece's folder, every folder and file is named after the folder it is in.
        for (let index = 2; index < segments.length; index++) {
          const parent = segments[index - 1] ?? ''
          const name = index === segments.length - 1 ? stem(file) : segments[index] ?? ''
          if (!isPrefixed(name, parent)) context.report({ node, messageId: 'prefix', data: { name, folder: parent } })
        }
      },
      ImportDeclaration(node) {
        const other = featureOf(posix.join(posix.dirname(inside), node.source.value))
        if (top === 'features' && node.source.value.startsWith('.') && other !== null && other !== segments[1]) {
          context.report({ node, messageId: 'feature', data: { inside, other } })
        }
        if (mayRequest || node.source.value !== '@newt-js/client' || isTypeOnly(node.source)) return
        for (const specifier of node.specifiers) {
          const imported = specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier' ? specifier.imported.name : null
          const typeOnly = specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'
          if (imported === 'Requester' && !typeOnly) context.report({ node: specifier, messageId: 'requester' })
        }
      },
    }
  },
}
