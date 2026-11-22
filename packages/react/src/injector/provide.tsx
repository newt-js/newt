import type { ServiceClass } from '@newt-js/client'
import { Injector }          from '@newt-js/client'
import type { ReactNode }    from 'react'
import { useContext }        from 'react'
import { useEffect }         from 'react'
import { useRef }            from 'react'
import { useState }          from 'react'
// --------------------------------------------------------
import { InjectorContext }   from './injector-context'

type ProvideProps = {
  services: ServiceClass[]
  children: ReactNode
}

/**
 * Gives the components below their own instances of `services`, which live as long as this element. Provide a
 * service in the lowest component that holds everyone who shares it.
 */
export function Provide({ services, children }: ProvideProps) {
  const parent = useContext(InjectorContext)
  const [injector] = useState(() => new Injector(parent, services))
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // StrictMode unmounts and mounts again at once in development: only a real unmount, still unmounted a
      // moment later, releases the services.
      queueMicrotask(() => {
        if (!mounted.current) injector.dispose()
      })
    }
  }, [injector])

  return <InjectorContext.Provider value={injector}>{children}</InjectorContext.Provider>
}
