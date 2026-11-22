import { cn }           from 'cn'
import type { ReactNode } from 'react'
// --------------------------------------------------------
import type { Space }   from '../../tokens/tokens'
import { paddingClass } from '../../tokens/tokens'

type Axis = 'y' | 'x' | 'both'

const axisClass: Record<Axis, string> = {
  y: 'overflow-y-auto overflow-x-hidden',
  x: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
}

type ScrollProps = {
  axis?: Axis
  padding?: Space
  children: ReactNode
}

/** Takes the room left in its parent and scrolls its content inside it, so the rest of the page stays still. */
export function Scroll({ axis = 'y', padding, children }: ScrollProps) {
  return <div className={cn('min-h-0 min-w-0 flex-1', axisClass[axis], padding !== undefined && paddingClass[padding])}>{children}</div>
}
