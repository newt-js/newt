import type { ReactNode } from 'react'
import { BrowserRouter }  from 'react-router'
// --------------------------------------------------------
import { LinkProvider }   from '../components/link/link-provider'
import { RouterLink }     from './router-link'

type RouterProps = {
  /** Where the backend serves the app, `/backoffice`: every route and link starts there. */
  basename: string
  children: ReactNode
}

/** The app's router, around it once: routes read the address, and every link of the components goes through it. */
export function Router({ basename, children }: RouterProps) {
  return (
    <BrowserRouter basename={basename}>
      <LinkProvider component={RouterLink}>{children}</LinkProvider>
    </BrowserRouter>
  )
}
