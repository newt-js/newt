import type { HttpRoute } from '../../router/http-route'

export function withCookies(route: HttpRoute): HttpRoute {
  return async request => {
    const response = await route(request)
    const cookies = request.cookies.toSetCookieHeaders()
    if (cookies.length === 0) {
      return response
    }
    const copy = new Response(response.body, response)
    for (const cookie of cookies) {
      copy.headers.append('set-cookie', cookie)
    }
    return copy
  }
}
