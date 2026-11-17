import type { LayeredOptions } from '../../layers/layering'
import { addLimits }           from '../../rate-limits/add-limits/add-limits'
import type { HttpRequest }    from '../../request/http-request'
import type { HttpMethod }     from '../http-route'
import type { HttpRoute }      from '../http-route'
import type { Middleware }     from '../middleware'
import type { RouteOptions }   from '../route-options'

type Register = (method: HttpMethod, path: string, route: HttpRoute<any>, options: LayeredOptions) => void

export class HttpGroup<Prefix extends string> {

  constructor(
    private readonly register: Register,
    private readonly prefix: Prefix,
    private readonly middleware: Middleware<Prefix>,
    private readonly options: RouteOptions = {},
  ) {}

  get<Path extends string>(path: Path, route: HttpRoute<`${Prefix}${Path}`>, options?: RouteOptions): void {
    this.register('GET', `${this.prefix}${path}`, this.around(route), this.with(options))
  }

  post<Path extends string>(path: Path, route: HttpRoute<`${Prefix}${Path}`>, options?: RouteOptions): void {
    this.register('POST', `${this.prefix}${path}`, this.around(route), this.with(options))
  }

  put<Path extends string>(path: Path, route: HttpRoute<`${Prefix}${Path}`>, options?: RouteOptions): void {
    this.register('PUT', `${this.prefix}${path}`, this.around(route), this.with(options))
  }

  patch<Path extends string>(path: Path, route: HttpRoute<`${Prefix}${Path}`>, options?: RouteOptions): void {
    this.register('PATCH', `${this.prefix}${path}`, this.around(route), this.with(options))
  }

  delete<Path extends string>(path: Path, route: HttpRoute<`${Prefix}${Path}`>, options?: RouteOptions): void {
    this.register('DELETE', `${this.prefix}${path}`, this.around(route), this.with(options))
  }

  private with(options: RouteOptions = {}): LayeredOptions {
    return { ...this.options, ...options, rateLimit: addLimits(this.options.rateLimit, options.rateLimit) }
  }

  private around<Path extends string>(route: HttpRoute<`${Prefix}${Path}`>): HttpRoute<`${Prefix}${Path}`> {
    return request => this.middleware(request as unknown as HttpRequest<Prefix>, async () => route(request))
  }
}
