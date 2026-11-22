import { cn }               from 'cn'
import type { ReactNode }   from 'react'
// --------------------------------------------------------
import type { LayoutProps } from '../layout/layout'
import { layoutClass }      from '../layout/layout'

type RowProps = LayoutProps & {
  /** Moves what does not fit to the next line. */
  wrap?: boolean
  children?: ReactNode
}

/** Lays its children out side by side. */
export function Row({ as: Element = 'div', gap = 2, align = 'center', wrap = false, children, ...layout }: RowProps) {
  return <Element className={cn('flex flex-row', wrap && 'flex-wrap', layoutClass({ gap, align, ...layout }))}>{children}</Element>
}
