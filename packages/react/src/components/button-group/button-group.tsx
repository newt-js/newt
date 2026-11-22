import type { ReactNode }                   from 'react'
// --------------------------------------------------------
import { ButtonGroup as ShadcnButtonGroup } from '../../shadcn/button-group'

type ButtonGroupProps = {
  /** What the buttons do together, read by a screen reader. */
  label: string
  /** `Button`s, joined into one piece. */
  children: ReactNode
}

/** Buttons that belong together, joined: Previous and Next, a split button with its `Menu`. */
export function ButtonGroup({ label, children }: ButtonGroupProps) {
  return <ShadcnButtonGroup aria-label={label}>{children}</ShadcnButtonGroup>
}
