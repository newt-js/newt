import { cn }             from 'cn'
import type { ReactNode } from 'react'
// --------------------------------------------------------
import type { Align }     from '../../tokens/tokens'
import type { Space }     from '../../tokens/tokens'
import { alignClass }     from '../../tokens/tokens'
import { gapClass }       from '../../tokens/tokens'

type StackProps = {
  gap?: Space
  align?: Align
  children: ReactNode
}

/** Lays its children out one under another: a column. */
export function Stack({ gap = 4, align = 'stretch', children }: StackProps) {
  return <div className={cn('flex flex-col', gapClass[gap], alignClass[align])}>{children}</div>
}
