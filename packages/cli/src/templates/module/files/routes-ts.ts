import type { ModuleNames } from '../../../names/module-names/module-names'

/** The head of the routes function: given the module's deps once it has them. */
export const routesHead = ({ type, plural }: ModuleNames, withDeps: boolean) =>
  `export function register${type}Routes(\n  router: HttpRouter,\n  ${plural}: ${type}_Module,\n${withDeps ? `  deps: ${type}_Deps,\n` : ''}) {`

export function routesTs(names: ModuleNames): string {
  const { folder, module, type, plural, path } = names
  return `import { bodyOf, pageRequestFrom, type HttpRouter } from '@newt-js/core/http'
import type { ${type}_Module } from './${folder}.module'

${routesHead(names, false)}
  router.post('/${path}', async request => Response.json(await ${plural}.create(await bodyOf(request)), { status: 201 }))
  router.get('/${path}', async request => Response.json(await ${plural}.paginate({}, pageRequestFrom(request))))
  router.get('/${path}/:id', async request => Response.json(await ${plural}.get(request.params.id)))
  return { one: router.group('/${path}/:${module}Id') }
}
`
}
