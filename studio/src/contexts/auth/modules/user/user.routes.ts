import type { HttpRouter }  from '@newt-js/core/http'
import { bodyOf }           from '@newt-js/core/http'
import { pageRequestFrom }  from '@newt-js/core/http'
// --------------------------------------------------------
import type { User_Deps }   from './user.deps'
import type { User_Module } from './user.module'

export function registerUserRoutes(
  router: HttpRouter,
  users: User_Module,
  deps: User_Deps,
) {
  router.post('/setup', async request => {
    const body = await bodyOf(request)
    const admin = await users.createFirstAdmin(body)
    return Response.json(admin, { status: 201 })
  }, { public: true })
  router.post('/users', async request => {
    const granted = await users.grantAccess(await bodyOf(request))
    return Response.json(granted, { status: 201 })
  })
  router.get('/users', async request => {
    const page = pageRequestFrom(request)
    return Response.json(await users.paginate({}, page))
  })
  router.get('/users/:id', async request => {
    return Response.json(await users.get(request.params.id))
  })
  return { one: router.group('/users/:userId') }
}
