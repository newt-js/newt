import { NotFoundError } from '../../../../domain/errors/not-found-error/not-found-error'

export class RouteNotFound extends NotFoundError<{ method: string, path: string }> {
  readonly code = 'route_not_found'
  constructor(method: string, path: string) {
    super(`No route ${method} ${path}`, { method, path })
  }
}
