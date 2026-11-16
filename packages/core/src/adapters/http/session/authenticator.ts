import type { Actor }       from '../../../domain/actor/actor'
import type { HttpRequest } from '../request/http-request'

export type Authenticator = (request: HttpRequest) => Promise<Actor | null>
