import { Injector }          from './injector'
import { rootInjector }      from './root-injector'
import type { ServiceClass } from './service-class'

/** For a service: another service, from its own level or above. */
export function inject<T>(service: ServiceClass<T>): T {
  return (Injector.current ?? rootInjector).get(service)
}
