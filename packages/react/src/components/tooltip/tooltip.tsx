import type { ReactElement }          from 'react'
// --------------------------------------------------------
import { Tooltip as ShadcnTooltip }   from '../../shadcn/tooltip'
import { TooltipContent }             from '../../shadcn/tooltip'
import { TooltipTrigger }             from '../../shadcn/tooltip'

type TooltipProps = {
  /** A few words. */
  text: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** What it explains: one `Button`, usually of an icon, which also has its `label`. */
  children: ReactElement
}

/** A few words about a control, on pointing at it or focusing it. Never what the control needs to be used. */
export function Tooltip({ text, side = 'top', children }: TooltipProps) {
  return (
    <ShadcnTooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </ShadcnTooltip>
  )
}
