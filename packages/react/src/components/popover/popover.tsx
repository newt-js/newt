import type { ReactNode }            from 'react'
// --------------------------------------------------------
import { Popover as ShadcnPopover }  from '../../shadcn/popover'
import { PopoverContent }            from '../../shadcn/popover'
import { PopoverTrigger }            from '../../shadcn/popover'

type PopoverProps = {
  /** What opens it: one `Button`. */
  trigger: ReactNode
  /** Controlled, to close it from inside: after a filter is applied, say. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

/** A small panel by a button, for a few controls: the filters of a list, a color. For actions, a `Menu`. */
export function Popover({ trigger, open, onOpenChange, align = 'center', children }: PopoverProps) {
  return (
    <ShadcnPopover {...(open === undefined ? {} : { open })} {...(onOpenChange ? { onOpenChange } : {})}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align}>{children}</PopoverContent>
    </ShadcnPopover>
  )
}
