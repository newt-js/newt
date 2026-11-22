import type { ReactNode }          from 'react'
// --------------------------------------------------------
import { Drawer as ShadcnDrawer }  from '../../shadcn/drawer'
import { DrawerContent }           from '../../shadcn/drawer'
import { DrawerDescription }       from '../../shadcn/drawer'
import { DrawerFooter }            from '../../shadcn/drawer'
import { DrawerHeader }            from '../../shadcn/drawer'
import { DrawerTitle }             from '../../shadcn/drawer'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Its actions, usually buttons. */
  footer?: ReactNode
}

/** A panel from the bottom, dragged down to close: what a phone shows instead of a `Dialog`. */
export function Drawer({ open, onOpenChange, title, description, children, footer }: DrawerProps) {
  return (
    <ShadcnDrawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent {...(description === undefined ? { 'aria-describedby': undefined } : {})}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description !== undefined && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        {children !== undefined && <div className="overflow-y-auto px-4">{children}</div>}
        {footer !== undefined && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </ShadcnDrawer>
  )
}
