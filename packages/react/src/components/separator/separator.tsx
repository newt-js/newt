import { Separator as ShadcnSeparator } from '../../shadcn/separator'

type SeparatorProps = {
  /** `vertical` between the pieces of a Row. */
  orientation?: 'horizontal' | 'vertical'
}

/** A line between two parts that belong apart. */
export function Separator({ orientation = 'horizontal' }: SeparatorProps) {
  return <ShadcnSeparator orientation={orientation} />
}
