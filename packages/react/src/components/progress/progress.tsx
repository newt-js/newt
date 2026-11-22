import { Progress as ShadcnProgress } from '../../shadcn/progress'

type ProgressProps = {
  /** From 0 to 100. */
  value: number
  /** What is advancing, read by a screen reader. */
  label: string
}

/** How far something has gone: an upload, the steps of a setup. */
export function Progress({ value, label }: ProgressProps) {
  return <ShadcnProgress value={value} aria-label={label} />
}
