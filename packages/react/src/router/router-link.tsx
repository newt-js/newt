import type { ComponentProps }   from 'react'
import { Link }                  from 'react-router'
// --------------------------------------------------------
import type { LinkComponent }    from '../components/link/link-component'

/** The components' links, through the router: they change the page without reloading it. */
export function RouterLink({ href, children, ...rest }: ComponentProps<LinkComponent>) {
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  )
}
