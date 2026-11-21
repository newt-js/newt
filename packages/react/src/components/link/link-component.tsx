import type { ComponentProps } from 'react'
import type { ComponentType }  from 'react'
import type { MouseEvent }     from 'react'
import type { ReactNode }      from 'react'
import { createContext }       from 'react'

/** What renders a link to another address: a plain `<a>`, or an app router's own link. */
export type LinkComponent = ComponentType<{
  href: string
  className?: string | undefined
  children?: ReactNode
  'aria-label'?: string | undefined
  'aria-current'?: 'page' | undefined
  onClick?: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined
}>

function PlainLink({ href, children, ...rest }: ComponentProps<LinkComponent>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

/** The components' links render with this. A plain `<a>` unless the app provides its router's. */
export const LinkComponentContext = createContext<LinkComponent>(PlainLink)
