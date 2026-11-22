import { useRef, type ReactNode } from 'react'
import { cn } from 'cn'
import {
  Dialog as ShadcnDialog,
  DialogContent as ShadcnDialogContent,
  DialogDescription as ShadcnDialogDescription,
  DialogFooter as ShadcnDialogFooter,
  DialogHeader as ShadcnDialogHeader,
  DialogTitle as ShadcnDialogTitle,
} from '../../shadcn/dialog'

/** `full` is as big as the screen lets it be: all of it on a phone. */
type Size = 'sm' | 'md' | 'lg' | 'full'

const sizeClass: Record<Size, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  full: 'top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 sm:top-[50%] sm:left-[50%] sm:h-[90dvh] sm:w-[95vw] sm:max-w-7xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border',
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  size?: Size
  /** The dialog's body. */
  children?: ReactNode
  /** The dialog's actions, usually buttons. */
  footer?: ReactNode
}

/**
 * A modal dialog. It traps focus while open and closes on Escape, on the close
 * button and on a click outside; all of them call `onOpenChange(false)`. Closed, it
 * gives the focus back to the button that opened it; opened from a menu's action, to
 * the menu's button, since the menu is gone by then.
 */
export function Dialog({ open, onOpenChange, title, description, size = 'md', children, footer }: DialogProps) {
  // Radix gives the focus back only to a trigger of its own; this dialog is opened by
  // the page, from any button, so it remembers which.
  const opener = useRef<HTMLElement | null>(null)
  return (
    <ShadcnDialog open={open} onOpenChange={onOpenChange}>
      <ShadcnDialogContent
        onOpenAutoFocus={() => {
          opener.current = openerOf(document.activeElement)
        }}
        onCloseAutoFocus={event => {
          // Nothing had the focus, or what had it is gone: the focus goes where the browser puts it.
          if (!opener.current?.isConnected) {
            return
          }
          event.preventDefault()
          opener.current.focus()
        }}
        className={cn('max-h-[calc(100dvh-2rem)] overflow-y-auto', sizeClass[size])}
        // Without a description there is nothing to point at.
        {...(description === undefined ? { 'aria-describedby': undefined } : {})}
      >
        <ShadcnDialogHeader>
          <ShadcnDialogTitle>{title}</ShadcnDialogTitle>
          {description !== undefined && <ShadcnDialogDescription>{description}</ShadcnDialogDescription>}
        </ShadcnDialogHeader>
        {children !== undefined && <div className={cn('min-w-0 text-sm', size === 'full' && 'min-h-0 flex-1')}>{children}</div>}
        {footer !== undefined && <ShadcnDialogFooter>{footer}</ShadcnDialogFooter>}
      </ShadcnDialogContent>
    </ShadcnDialog>
  )
}

/**
 * What to give the focus back to: what has it as the dialog opens, unless it is the page
 * itself, or an action of a menu, which closes as the dialog opens: then the button that
 * opened the menu, the one that controls it.
 */
function openerOf(active: Element | null): HTMLElement | null {
  if (!(active instanceof HTMLElement) || active === document.body) {
    return null
  }
  const menu = active.closest('[role="menu"]')
  if (!menu) {
    return active
  }
  const trigger = menu.id ? document.querySelector(`[aria-controls="${menu.id}"]`) : null
  return trigger instanceof HTMLElement ? trigger : null
}
