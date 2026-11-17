import type { ModuleNames } from '../../../names/module-names/module-names'

/** Where add-route puts a route: after the line that starts the routes function, whatever it takes. */
export const routesStart = ({ type }: ModuleNames) => `export function register${type}Routes(`

/** The line that starts the routes function: given the module's deps once it has them. */
export const routesHead = ({ type, plural }: ModuleNames, withDeps: boolean) =>
  `export function register${type}Routes(router: HttpRouter, ${plural}: ${type}_Module${withDeps ? `, deps: ${type}_Deps` : ''}) {`

export function routesTs(names: ModuleNames): string {
  const { folder, module, type, plural, path } = names
  return `import { bodyOf, pageRequestFrom, type HttpRouter } from '@newt-js/core/http'
import type { ${type}_Module } from './${folder}.module'
import { ${type}Id } from './value-objects/${folder}-id'

${routesHead(names, false)}
  router.post('/${path}', async request => Response.json(await ${plural}.create(await bodyOf(request)), { status: 201 }))
  router.get('/${path}', async request => Response.json(await ${plural}.paginate({}, pageRequestFrom(request))))
  router.get('/${path}/:id', async request => Response.json(await ${plural}.get(${type}Id.from(request.params.id))))
  return { one: router.group('/${path}/:${module}Id') }
}
`
}
