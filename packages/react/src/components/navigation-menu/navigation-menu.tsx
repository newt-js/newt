import { useContext }                             from 'react'
// --------------------------------------------------------
import { NavigationMenu as ShadcnNavigationMenu } from '../../shadcn/navigation-menu'
import { NavigationMenuContent }                  from '../../shadcn/navigation-menu'
import { NavigationMenuItem }                     from '../../shadcn/navigation-menu'
import { NavigationMenuLink }                     from '../../shadcn/navigation-menu'
import { NavigationMenuList }                     from '../../shadcn/navigation-menu'
import { NavigationMenuTrigger }                  from '../../shadcn/navigation-menu'
import { navigationMenuTriggerStyle }             from '../../shadcn/navigation-menu'
import { LinkComponentContext }                   from '../link/link-component'

export type NavLink = {
  label: string
  href: string
  /** A line under it, in a group. */
  description?: string
}

/** A link, or a group of them that opens below its name. */
export type NavEntry = NavLink | { label: string, links: NavLink[] }

/** The main links of a public site, across its top. For an app's sections, a `SidebarLayout`. */
export function NavigationMenu({ entries }: { entries: NavEntry[] }) {
  const Link = useContext(LinkComponentContext)
  return (
    <ShadcnNavigationMenu>
      <NavigationMenuList>
        {entries.map(entry => (
          <NavigationMenuItem key={entry.label}>
            {'links' in entry ? (
              <>
                <NavigationMenuTrigger>{entry.label}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-80 gap-1">
                    {entry.links.map(link => (
                      <li key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link href={link.href}>
                            <span className="font-medium">{link.label}</span>
                            {link.description && <span className="text-muted-foreground">{link.description}</span>}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href={entry.href}>{entry.label}</Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </ShadcnNavigationMenu>
  )
}
