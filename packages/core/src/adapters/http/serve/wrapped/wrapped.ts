import { Handler }   from '../handler'
import { isMethods } from '../is-methods/is-methods'

export function wrapped(routes: Bun.Serve.Routes<undefined, string>, note: (handler: Handler) => Handler): Bun.Serve.Routes<undefined, string> {
  return Object.fromEntries(Object.entries(routes).map(([path, route]) => [path,
    typeof route === 'function' ? note(route as Handler)
      : isMethods(route) ? Object.fromEntries(Object.entries(route).map(([method, handler]) => [method, typeof handler === 'function' ? note(handler as Handler) : handler]))
        : route,
  ])) as Bun.Serve.Routes<undefined, string>
}
