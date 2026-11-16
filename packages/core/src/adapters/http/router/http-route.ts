import type { HttpRequest } from '../request/http-request'

export type HttpRoute<Path extends string = string> = (request: HttpRequest<Path>) => Response | Promise<Response>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ErrorHandler = (error: unknown, request: Request) => Response | Promise<Response>
