import type { ReactNode }     from 'react'
import { useContext }         from 'react'
// --------------------------------------------------------
import { Item as ShadcnItem } from '../../shadcn/item'
import { ItemActions }        from '../../shadcn/item'
import { ItemContent }        from '../../shadcn/item'
import { ItemDescription }    from '../../shadcn/item'
import { ItemMedia }          from '../../shadcn/item'
import { ItemTitle }          from '../../shadcn/item'
import { LinkComponentContext } from '../link/link-component'

type ItemProps = {
  title: ReactNode
  description?: ReactNode
  /** Before the text: an `Avatar`, an icon. */
  media?: ReactNode
  /** After the text: a `Badge`, a `Button`, a menu. */
  actions?: ReactNode
  /** With `href` the whole item is a link, through the app's router. */
  href?: string
  /** `outline` sets it apart from what is around it. */
  variant?: 'default' | 'outline' | 'muted'
}

/** One thing in a list: its picture, what it is, and what can be done with it. */
export function Item({ title, description, media, actions, href, variant = 'default' }: ItemProps) {
  const Link = useContext(LinkComponentContext)
  const inside = (
    <>
      {media !== undefined && <ItemMedia>{media}</ItemMedia>}
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description !== undefined && <ItemDescription>{description}</ItemDescription>}
      </ItemContent>
      {actions !== undefined && <ItemActions>{actions}</ItemActions>}
    </>
  )
  if (href === undefined) return <ShadcnItem variant={variant}>{inside}</ShadcnItem>
  return <ShadcnItem variant={variant} asChild><Link href={href}>{inside}</Link></ShadcnItem>
}
