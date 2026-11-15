import { HttpRequest } from '../request/http-request'

export type Middleware<Prefix extends string> = (request: HttpRequest<Prefix>, next: () => Promise<Response>) => Response | Promise<Response>
