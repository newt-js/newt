import type { ModuleNames } from '../../../names/module-names/module-names'

export const routesHead = ({ type, plural }: ModuleNames) => `export function register${type}Routes(router: HttpRouter, ${plural}: ${type}_Module): void {`

export function routesTs(names: ModuleNames): string {
  const { folder, type, plural, path } = names
  return `import { bodyOf, pageRequestFrom, type HttpRouter } from '@newt-js/core/http'
import type { ${type}_Module } from './${folder}.module'
import { ${type}Id } from './value-objects/${folder}-id'

${routesHead(names)}
  router.post('/${path}', async request => Response.json(await ${plural}.create(await bodyOf(request)), { status: 201 }))
  router.get('/${path}', async request => Response.json(await ${plural}.paginate({}, pageRequestFrom(request))))
  router.get('/${path}/:id', async request => Response.json(await ${plural}.get({ id: ${type}Id.from(request.params.id) })))
}
`
}
