import type { ReactNode }                    from 'react'
// --------------------------------------------------------
import { Collapsible as ShadcnCollapsible }  from '../../shadcn/collapsible'
import { CollapsibleContent }                from '../../shadcn/collapsible'
import { CollapsibleTrigger }                from '../../shadcn/collapsible'

type CollapsibleProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What opens and closes it: one `Button`. */
  trigger: ReactNode
  children: ReactNode
}

/** One part that shows or hides: the details of a row, advanced options. For several, an `Accordion`. */
export function Collapsible({ open, onOpenChange, trigger, children }: CollapsibleProps) {
  return (
    <ShadcnCollapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>{trigger}</CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </ShadcnCollapsible>
  )
}
