import type { ReadonlySignal } from '@newt-js/client'
import { Navigate }            from 'react-router'
import { Outlet }              from 'react-router'
import { useLocation }         from 'react-router'
// --------------------------------------------------------
import { useValue }            from '../use-value/use-value'

type GuardProps = {
  /** Whether the routes inside may be seen: `true` lets them through, `false` sends away, `null` is not known yet. */
  allows: ReadonlySignal<boolean | null>
  /** Where to send a person who may not see them: the sign-in, or a page that says why. */
  otherwise: string
}

/**
 * A layout route that keeps the routes inside it for those it allows: `<Route element={<Guard allows={...}
 * otherwise="/sign-in" />}>`. Who is sent away carries `?next=` with where they were going, to come back after.
 * Until it is known, nothing shows. It hides pages; the backend is what refuses the data.
 */
export function Guard({ allows, otherwise }: GuardProps) {
  const allowed = useValue(allows)
  const { pathname, search } = useLocation()
  if (allowed === null) return null
  if (allowed) return <Outlet />
  const next = new URLSearchParams({ next: `${pathname}${search}` })
  return <Navigate to={`${otherwise}?${next}`} replace />
}
