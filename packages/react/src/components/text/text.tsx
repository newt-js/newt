import { cn }             from 'cn'
import type { ReactNode } from 'react'

type Tone = 'default' | 'muted' | 'error'

const toneClass: Record<Tone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  error: 'text-destructive',
}

type Size = 'sm' | 'md'

const sizeClass: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
}

type TextProps = {
  tone?: Tone
  size?: Size
  /** Bold, for the word that matters in a line. */
  strong?: boolean
  /** A paragraph by default; `span` sits inside a line. */
  as?: 'p' | 'span'
  children: ReactNode
}

/** Running text, in the theme's colors and sizes. */
export function Text({ tone = 'default', size = 'md', strong = false, as: Element = 'p', children }: TextProps) {
  return <Element className={cn(toneClass[tone], sizeClass[size], strong && 'font-semibold')}>{children}</Element>
}
