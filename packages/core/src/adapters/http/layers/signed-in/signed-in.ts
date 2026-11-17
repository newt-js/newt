import { runAsActor }         from '../../../../domain/actor/run-as-actor/run-as-actor'
import { NotSignedIn }        from '../../errors/not-signed-in/not-signed-in'
import type { HttpRoute }     from '../../router/http-route'
import type { Authenticator } from '../../session/authenticator'

export function signedIn(route: HttpRoute, authenticator: () => Authenticator | null): HttpRoute {
  return async request => {
    const authenticate = authenticator()
    const actor = authenticate ? await authenticate(request) : null
    if (!actor) {
      throw new NotSignedIn()
    }
    return runAsActor(actor, () => route(request))
  }
}
