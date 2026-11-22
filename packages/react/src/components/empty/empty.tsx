import type { LucideIcon }    from 'lucide-react'
import type { ReactNode }     from 'react'
// --------------------------------------------------------
import { Empty as ShadcnEmpty } from '../../shadcn/empty'
import { EmptyContent }       from '../../shadcn/empty'
import { EmptyDescription }   from '../../shadcn/empty'
import { EmptyHeader }        from '../../shadcn/empty'
import { EmptyMedia }         from '../../shadcn/empty'
import { EmptyTitle }         from '../../shadcn/empty'

type EmptyProps = {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** What to do next: usually one `Button`. */
  action?: ReactNode
}

/** What a list or a page shows while it has nothing: what would be here, and how to add the first. */
export function Empty({ icon: Icon, title, description, action }: EmptyProps) {
  return (
    <ShadcnEmpty className="border border-dashed">
      <EmptyHeader>
        {Icon && <EmptyMedia variant="icon"><Icon aria-hidden /></EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description !== undefined && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action !== undefined && <EmptyContent>{action}</EmptyContent>}
    </ShadcnEmpty>
  )
}
