import { cn }             from 'cn'
import type { ReactNode } from 'react'
// --------------------------------------------------------
import type { Align }     from '../../tokens/tokens'
import type { Justify }   from '../../tokens/tokens'
import type { Space }     from '../../tokens/tokens'
import { alignClass }     from '../../tokens/tokens'
import { gapClass }       from '../../tokens/tokens'
import { justifyClass }   from '../../tokens/tokens'

type InlineProps = {
  gap?: Space
  align?: Align
  justify?: Justify
  wrap?: boolean
  children: ReactNode
}

/** Lays its children out side by side: a row. */
export function Inline({ gap = 2, align = 'center', justify = 'start', wrap = false, children }: InlineProps) {
  return (
    <div className={cn('flex flex-row', gapClass[gap], alignClass[align], justifyClass[justify], wrap && 'flex-wrap')}>
      {children}
    </div>
  )
}
