import type { ReactNode }          from 'react'
// --------------------------------------------------------
import { Marker as ShadcnMarker }  from '../../shadcn/marker'

type MarkerProps = {
  /** `separator` draws a line on each side: "Today" between the messages of yesterday and today's. */
  variant?: 'default' | 'separator'
  children: ReactNode
}

/** A quiet note between the things of a list: a day in a conversation, "3 new". */
export function Marker({ variant = 'default', children }: MarkerProps) {
  return <ShadcnMarker variant={variant}>{children}</ShadcnMarker>
}
