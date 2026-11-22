import type { LucideIcon }       from 'lucide-react'
import type { ReactNode }        from 'react'
import { useContext }            from 'react'
import { useLocation }           from 'react-router'
import { useResolvedPath }       from 'react-router'
// --------------------------------------------------------
import { Sidebar }               from '../../shadcn/sidebar'
import { SidebarContent }        from '../../shadcn/sidebar'
import { SidebarFooter }         from '../../shadcn/sidebar'
import { SidebarGroup }          from '../../shadcn/sidebar'
import { SidebarGroupContent }   from '../../shadcn/sidebar'
import { SidebarGroupLabel }     from '../../shadcn/sidebar'
import { SidebarHeader }         from '../../shadcn/sidebar'
import { SidebarInset }          from '../../shadcn/sidebar'
import { SidebarMenu }           from '../../shadcn/sidebar'
import { SidebarMenuBadge }      from '../../shadcn/sidebar'
import { SidebarMenuButton }     from '../../shadcn/sidebar'
import { SidebarMenuItem }       from '../../shadcn/sidebar'
import { SidebarProvider }       from '../../shadcn/sidebar'
import { SidebarTrigger }        from '../../shadcn/sidebar'
import { LinkComponentContext }  from '../link/link-component'

export type SidebarLink = {
  label: string
  href: string
  icon?: LucideIcon
  /** How many wait there: unread, pending. */
  count?: number
}

export type SidebarSection = {
  /** Its name over the links; none for the first. */
  label?: string
  links: SidebarLink[]
}

type SidebarLayoutProps = {
  /** At the top: the app's name or the workspace. */
  header?: ReactNode
  sections: SidebarSection[]
  /** At the bottom: the user. */
  footer?: ReactNode
  /** The page: `<Outlet />`, in a shell. */
  children: ReactNode
}

/**
 * The frame of an app with sections: links on the side and the page beside them. On a phone the side opens
 * from a button, and ⌘B folds it. The link of the page a person is on is marked. It goes in the shell.
 */
export function SidebarLayout({ header, sections, footer, children }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        {header !== undefined && <SidebarHeader>{header}</SidebarHeader>}
        <SidebarContent>
          {sections.map((section, index) => (
            <SidebarGroup key={section.label ?? index}>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.links.map(link => <SidebarLinkItem key={link.href} link={link} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        {footer !== undefined && <SidebarFooter>{footer}</SidebarFooter>}
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center px-2 md:hidden"><SidebarTrigger /></header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

function SidebarLinkItem({ link }: { link: SidebarLink }) {
  const Link = useContext(LinkComponentContext)
  const { pathname } = useLocation()
  const target = useResolvedPath(link.href).pathname
  const active = pathname === target || pathname.startsWith(`${target}/`)
  const Icon = link.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={link.label}>
        <Link href={link.href} aria-current={active ? 'page' : undefined}>
          {Icon && <Icon aria-hidden />}
          <span>{link.label}</span>
        </Link>
      </SidebarMenuButton>
      {link.count !== undefined && <SidebarMenuBadge>{link.count}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}
