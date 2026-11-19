import type { HttpRouter }         from '@newt-js/core/http'
import { bodyOf }                  from '@newt-js/core/http'
import { pageRequestFrom }         from '@newt-js/core/http'
// --------------------------------------------------------
import type { Application_Module } from './application.module'

export function registerApplicationRoutes(
  router: HttpRouter,
  applications: Application_Module,
) {
  router.post('/applications', async request => {
    const created = await applications.create(await bodyOf(request))
    return Response.json(created, { status: 201 })
  })
  router.get('/applications', async request => {
    const page = pageRequestFrom(request)
    return Response.json(await applications.paginate({}, page))
  })
  router.get('/applications/:id', async request => {
    return Response.json(await applications.get(request.params.id))
  })
  return { one: router.group('/applications/:applicationId') }
}
