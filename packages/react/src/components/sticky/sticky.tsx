import { cn }           from 'cn'
import type { ReactNode } from 'react'

type Edge = 'top' | 'bottom'

type StickyProps = {
  edge?: Edge
  children: ReactNode
}

/** Stays on its edge of the closest Scroll (or the page) while the rest scrolls under it: a header, a bar of actions. */
export function Sticky({ edge = 'top', children }: StickyProps) {
  return <div className={cn('sticky z-10 bg-background', edge === 'top' ? 'top-0' : 'bottom-0')}>{children}</div>
}
