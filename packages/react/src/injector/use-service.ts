import type { ServiceClass } from '@newt-js/client'
import { useContext }        from 'react'
// --------------------------------------------------------
import { InjectorContext }   from './injector-context'

/** For a component: the service from the closest `Provide` above, or the app's. */
export function useService<T>(service: ServiceClass<T>): T {
  return useContext(InjectorContext).get(service)
}
