import type { ReactNode } from 'react'

type Level = 1 | 2 | 3 | 4

const levelClass: Record<Level, string> = {
  1: 'text-2xl font-semibold tracking-tight',
  2: 'text-xl font-semibold tracking-tight',
  3: 'text-lg font-semibold',
  4: 'text-base font-semibold',
}

type HeadingProps = {
  /** Its place in the page's outline: 1 is the page's title. */
  level?: Level
  children: ReactNode
}

/** A title: the page's (level 1) or a part's. */
export function Heading({ level = 1, children }: HeadingProps) {
  const Element = `h${level}` as const
  return <Element className={`text-foreground ${levelClass[level]}`}>{children}</Element>
}
