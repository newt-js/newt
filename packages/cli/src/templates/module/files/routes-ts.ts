import type { ModuleNames } from '../../../names/module-names/module-names'
import { fitting }          from '../../fitted-call/fitted-call'

/** The head of the routes function: given the module's deps once it has them. */
export const routesHead = ({ type, plural }: ModuleNames, withDeps: boolean) =>
  `export function register${type}Routes(\n  router: HttpRouter,\n  ${plural}: ${type}_Module,\n${withDeps ? `  deps: ${type}_Deps,\n` : ''}) {`

export function routesTs(names: ModuleNames): string {
  const { folder, module, type, plural, path } = names
  return `import { bodyOf, pageRequestFrom, type HttpRouter } from '@newt-js/core/http'
import type { ${type}_Module } from './${folder}.module'

${routesHead(names, false)}
  router.post('/${path}', async request => {
    const body = await bodyOf(request)
    const created = await ${plural}.create(body)
    return Response.json(created, { status: 201 })
  })
  router.get('/${path}', async request => {
    const page = pageRequestFrom(request)
    return Response.json(await ${plural}.paginate({}, page))
  })
  router.get('/${path}/:id', async request => {
    const found = await ${plural}.get(request.params.id)
    return Response.json(found)
  })
${fitting(`  return { one: router.group('/${path}/:${module}Id') }`, `  return {\n    one: router.group('/${path}/:${module}Id'),\n  }`, `  return {\n    one: router.group(\n      '/${path}/:${module}Id',\n    ),\n  }`)}
}
`
}
