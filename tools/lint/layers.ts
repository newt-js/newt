import type { Rule } from 'eslint'
import { dirname }   from 'node:path'
import { resolve }   from 'node:path'
import { sep }       from 'node:path'
// --------------------------------------------------------
import { allowed }   from './allowed/allowed'

const ROOT = `${sep}packages${sep}core${sep}src${sep}`

const PORTS = ['database', 'files', 'cluster', 'email']

export function layerOf(file: string): string | null {
  const at = file.lastIndexOf(ROOT)
  if (at === -1) return null
  const parts = file.slice(at + ROOT.length).split(sep)
  if (parts.length < 2) return null
  if (parts[0] !== 'adapters') return parts[0]!
  return PORTS.includes(parts[1]!) && parts.length > 3 ? `adapters/${parts[1]}/${parts[2]}` : `adapters/${parts[1]}`
}

export const layers: Rule.RuleModule = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { outward: '{{from}} does not import from {{to}}: the core\'s layers depend inwards only' },
  },
  create(context) {
    const from = layerOf(context.filename)
    if (from === null) return {}
    const test = context.filename.endsWith('.test.ts')
    const check = (node: Rule.Node, path: unknown) => {
      if (typeof path !== 'string' || !path.startsWith('.')) return
      const to = layerOf(resolve(dirname(context.filename), path) + sep + 'x')
      if (to === null || to === from || allowed(from, to, test)) return
      context.report({ node, messageId: 'outward', data: { from, to } })
    }
    return {
      ImportDeclaration: node => check(node, node.source.value),
      ExportNamedDeclaration: node => check(node, node.source?.value),
      ExportAllDeclaration: node => check(node, node.source.value),
    }
  },
}
