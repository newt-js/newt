import { Actor }       from '../../../domain/actor/actor'
import { HttpRequest } from '../request/http-request'

export type Authenticator = (request: HttpRequest) => Promise<Actor | null>
