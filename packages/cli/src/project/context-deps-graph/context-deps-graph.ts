import { join }            from 'node:path'
// --------------------------------------------------------
import { CONTEXTS_FOLDER } from '../backend-contexts/backend-contexts'

const IMPORTED = /from\s+'\.\.\/([a-z0-9-]+)\/([a-z0-9-]+)\.context'/g

/** What each context of a backend is opened with: the other contexts its <ctx>.context.ts imports, as newt's lint reads them. */
export async function contextDepsGraph(backend: string, contexts: string[]): Promise<Map<string, string[]>> {
  const graph = new Map<string, string[]>()
  for (const name of contexts) {
    const file = Bun.file(join(backend, CONTEXTS_FOLDER, name, `${name}.context.ts`))
    const text = await file.exists() ? await file.text() : ''
    const used = [...text.matchAll(IMPORTED)].filter(match => match[1] === match[2] && match[1] !== name).map(match => match[1]!)
    graph.set(name, [...new Set(used)])
  }
  return graph
}

/** The contexts `name` is opened with, and those they are, each one after the ones it is opened with; `name` is not among them. */
export function openedBefore(graph: Map<string, string[]>, name: string): string[] {
  const order: string[] = []
  const visit = (each: string) => {
    for (const used of graph.get(each) ?? []) visit(used)
    if (each !== name && !order.includes(each)) order.push(each)
  }
  visit(name)
  return order
}
