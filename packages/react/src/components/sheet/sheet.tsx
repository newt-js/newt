import type { ReactNode }        from 'react'
// --------------------------------------------------------
import { Sheet as ShadcnSheet }  from '../../shadcn/sheet'
import { SheetContent }          from '../../shadcn/sheet'
import { SheetDescription }      from '../../shadcn/sheet'
import { SheetFooter }           from '../../shadcn/sheet'
import { SheetHeader }           from '../../shadcn/sheet'
import { SheetTitle }            from '../../shadcn/sheet'

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** The edge it comes from. */
  side?: 'right' | 'left' | 'top' | 'bottom'
  children?: ReactNode
  /** Its actions, usually buttons. */
  footer?: ReactNode
}

/** A panel from an edge, over the page: a thing's detail or a form, with the list still behind. */
export function Sheet({ open, onOpenChange, title, description, side = 'right', children, footer }: SheetProps) {
  return (
    <ShadcnSheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} {...(description === undefined ? { 'aria-describedby': undefined } : {})}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description !== undefined && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        {children !== undefined && <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>}
        {footer !== undefined && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </ShadcnSheet>
  )
}
