import type { HttpRouter }               from '@newt-js/core/http'
import { bodyOf }                        from '@newt-js/core/http'
import { pageRequestFrom }               from '@newt-js/core/http'
// --------------------------------------------------------
import type { ApplicationClient_Module } from './application-client.module'

export function registerApplicationClientRoutes(router: HttpRouter, applicationClients: ApplicationClient_Module) {
  router.post('/application-clients', async request => {
    const registered = await applicationClients.register(await bodyOf(request))
    return Response.json(registered, { status: 201 })
  })
  router.get('/application-clients', async request => {
    return Response.json(await applicationClients.paginate({}, pageRequestFrom(request)))
  })
  router.get('/application-clients/:id', async request => {
    return Response.json(await applicationClients.get(request.params.id))
  })
  return { one: router.group('/application-clients/:applicationClientId') }
}
