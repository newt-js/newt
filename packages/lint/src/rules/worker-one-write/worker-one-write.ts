import { TSESLint }     from '@typescript-eslint/utils'
import { TSESTree }     from '@typescript-eslint/utils'
import { existsSync }   from 'node:fs'
import { readFileSync } from 'node:fs'
import { posix }        from 'node:path'
// --------------------------------------------------------
import { slashed }      from '../../paths/paths'

/** A use case a worker runs: `<module>.on(<event>, '<use case>', …)` in `<m>.workers.ts`. */
const WORKER_USE_CASE = /\.on\(\s*[^,]+,\s*['"]([A-Za-z0-9_]+)['"]/g

/** The use cases the workers of a module's file run, read from its `<m>.workers.ts` beside it. */
function workerUseCasesOf(moduleFile: string): Set<string> {
  const workers = moduleFile.replace(/\.module\.ts$/, '.workers.ts')
  if (!existsSync(workers)) return new Set()
  return new Set([...readFileSync(workers, 'utf8').matchAll(WORKER_USE_CASE)].map(match => match[1]!))
}

type Methods = Map<string, TSESTree.MethodDefinition>

/** The method of the class `this.<name>(…)` calls, when it is one. */
function ownMethodCalled(call: TSESTree.CallExpression, methods: Methods): TSESTree.MethodDefinition | undefined {
  const callee = call.callee
  if (callee.type !== 'MemberExpression' || callee.object.type !== 'ThisExpression' || callee.computed || callee.property.type !== 'Identifier') return undefined
  return methods.get(callee.property.name)
}

/** Every node under `node`, itself first. */
function* under(node: TSESTree.Node): Generator<TSESTree.Node> {
  yield node
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && typeof (child as TSESTree.Node).type === 'string') yield* under(child as TSESTree.Node)
    }
  }
}

/** Whether a node writes: calls `persist`, or a method of the class that does. */
function writes(node: TSESTree.Node, methods: Methods, seen = new Set<TSESTree.MethodDefinition>()): boolean {
  for (const each of under(node)) {
    if (each.type !== 'CallExpression') continue
    const callee = each.callee
    if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === 'persist') return true
    const method = ownMethodCalled(each, methods)
    if (method && !seen.has(method)) {
      seen.add(method)
      if (method.value.body && writes(method.value.body, methods, seen)) return true
    }
  }
  return false
}

const LOOPS = new Set(['ForOfStatement', 'ForInStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement'])

/** A `return` that only hands back what is there: no await, so nothing more is done. */
const handsBack = (statement: TSESTree.Statement) =>
  statement.type === 'ReturnStatement' && ![...(statement.argument ? under(statement.argument) : [])].some(each => each.type === 'AwaitExpression')

/**
 * A use case a worker runs writes once, and last: the first `persist` takes the worker's event as received, so what
 * fails after it (another write, an email, a call out) is never retried. In a `*.module.ts`, for the use cases its
 * `<m>.workers.ts` runs, and the methods of the class they call: nothing after the statement that writes, but a
 * `return` of what is there; and no write in a loop. Two writes are two workers; an email goes before the write.
 */
export const workerOneWrite: TSESLint.RuleModule<'afterWrite' | 'inLoop'> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: { description: 'A use case a worker runs writes once, and last.' },
    messages: {
      afterWrite: "'{{useCase}}' runs on an event: its first write takes the event as received, so this, after it, is never retried if it fails. Do it before the write, or in a worker of its own.",
      inLoop: "'{{useCase}}' runs on an event: a write in a loop is many writes, and only the first is sure to happen. Write them all at once: persist([…]).",
    },
    schema: [],
  },
  create(context) {
    const file = slashed(context.filename)
    if (!posix.basename(file).endsWith('.module.ts')) return {}
    const workerUseCases = workerUseCasesOf(file)
    if (workerUseCases.size === 0) return {}
    return {
      ClassBody(body) {
        const methods: Methods = new Map(body.body
          .filter((each): each is TSESTree.MethodDefinition => each.type === 'MethodDefinition' && each.key.type === 'Identifier')
          .map(each => [(each.key as TSESTree.Identifier).name, each]))
        const checked = new Set<TSESTree.Node>()
        /** Reports what comes after the first write of `statements`, and goes into the blocks and methods that write. */
        const check = (statements: TSESTree.Statement[], useCase: string): void => {
          let written = false
          for (const statement of statements) {
            if (written) {
              if (!handsBack(statement)) context.report({ node: statement, messageId: 'afterWrite', data: { useCase } })
              continue
            }
            if (!writes(statement, methods)) continue
            written = true
            if (LOOPS.has(statement.type)) {
              context.report({ node: statement, messageId: 'inLoop', data: { useCase } })
              continue
            }
            for (const each of under(statement)) {
              if (each !== statement && each.type === 'BlockStatement' && !checked.has(each) && !LOOPS.has(each.parent?.type ?? '')) {
                checked.add(each)
                check(each.body, useCase)
              }
              if (each.type === 'CallExpression') {
                const method = ownMethodCalled(each, methods)
                if (method?.value.body && !checked.has(method)) {
                  checked.add(method)
                  check(method.value.body.body, useCase)
                }
              }
            }
          }
        }
        for (const name of workerUseCases) {
          const method = methods.get(name)
          if (method?.value.body) check(method.value.body.body, name)
        }
      },
    }
  },
}
