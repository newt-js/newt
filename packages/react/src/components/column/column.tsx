import { cn }               from 'cn'
import type { ReactNode }   from 'react'
// --------------------------------------------------------
import type { LayoutProps } from '../layout/layout'
import { layoutClass }      from '../layout/layout'

type ColumnProps = LayoutProps & {
  children?: ReactNode
}

/** Lays its children out one under another. */
export function Column({ as: Element = 'div', gap = 4, align = 'stretch', children, ...layout }: ColumnProps) {
  return <Element className={cn('flex flex-col', layoutClass({ gap, align, ...layout }))}>{children}</Element>
}
