import type { ReactNode }                 from 'react'
import { Fragment }                       from 'react'
import { useContext }                     from 'react'
// --------------------------------------------------------
import { Breadcrumb as ShadcnBreadcrumb } from '../../shadcn/breadcrumb'
import { BreadcrumbItem }                 from '../../shadcn/breadcrumb'
import { BreadcrumbLink }                 from '../../shadcn/breadcrumb'
import { BreadcrumbList }                 from '../../shadcn/breadcrumb'
import { BreadcrumbPage }                 from '../../shadcn/breadcrumb'
import { BreadcrumbSeparator }            from '../../shadcn/breadcrumb'
import { LinkComponentContext }           from '../link/link-component'

export type Crumb = {
  label: ReactNode
  href?: string
}

/** Where this page is, from the top down: `Clients / Acme / Invoices`. The last one is this page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const Link = useContext(LinkComponentContext)
  return (
    <ShadcnBreadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {last || item.href === undefined
                  ? <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  : <BreadcrumbLink asChild><Link href={item.href}>{item.label}</Link></BreadcrumbLink>}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </ShadcnBreadcrumb>
  )
}
