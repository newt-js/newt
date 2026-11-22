import type { ReactNode }                from 'react'
// --------------------------------------------------------
import { HoverCard as ShadcnHoverCard }  from '../../shadcn/hover-card'
import { HoverCardContent }              from '../../shadcn/hover-card'
import { HoverCardTrigger }              from '../../shadcn/hover-card'

type HoverCardProps = {
  /** What it is about: usually a link to the thing. */
  trigger: ReactNode
  /** A preview of the thing. */
  children: ReactNode
}

/**
 * A preview of something while the pointer is on its link: a person, a ticket. Only a preview: a keyboard and a
 * phone never see it, so nothing in it is needed.
 */
export function HoverCard({ trigger, children }: HoverCardProps) {
  return (
    <ShadcnHoverCard>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent>{children}</HoverCardContent>
    </ShadcnHoverCard>
  )
}
