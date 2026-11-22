import type { ReactNode }                  from 'react'
// --------------------------------------------------------
import { AspectRatio as ShadcnAspectRatio } from '../../shadcn/aspect-ratio'

type AspectRatioProps = {
  /** Width over height: `16 / 9`. */
  ratio: number
  /** An image or a video, which fills it. */
  children: ReactNode
}

/** Keeps its content at one shape, whatever its width. */
export function AspectRatio({ ratio, children }: AspectRatioProps) {
  return <ShadcnAspectRatio ratio={ratio}>{children}</ShadcnAspectRatio>
}
