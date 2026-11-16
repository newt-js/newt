import { join }          from 'node:path'
import { default as ts } from 'typescript'

export type RegisteredRoute = { file: string, handler: string }

const shapeOf = (path: string) => path.replace(/:[^/]+/g, ':')

/** The routes file under `src` that registers `method` at a path of the shape of `path`, whatever its params are called, with its handler's code; null when none does. */
export async function routeFileWith(src: string, method: string, path: string): Promise<RegisteredRoute | null> {
  for await (const file of new Bun.Glob('**/*.routes.ts').scan(src)) {
    const source = ts.createSourceFile(file, await Bun.file(join(src, file)).text(), ts.ScriptTarget.Latest, true)
    let handler: string | null = null
    const visit = (node: ts.Node) => {
      if (handler !== null) return
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === method) {
        const [first, ...rest] = node.arguments
        if (first && ts.isStringLiteralLike(first) && shapeOf(first.text) === shapeOf(path)) handler = rest.map(each => each.getText(source)).join(', ')
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    if (handler !== null) return { file: join('src', file), handler }
  }
  return null
}
