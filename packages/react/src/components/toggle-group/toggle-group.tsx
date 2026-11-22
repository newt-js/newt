import type { ReactNode }                  from 'react'
// --------------------------------------------------------
import { ToggleGroup as ShadcnToggleGroup } from '../../shadcn/toggle-group'
import { ToggleGroupItem }                  from '../../shadcn/toggle-group'

export type ToggleOption = {
  value: string
  /** What it says, or its accessible name when it shows an `icon`. */
  label: string
  icon?: ReactNode
}

type ToggleGroupProps = {
  options: ToggleOption[]
  value: string | null
  onChange: (value: string) => void
  /** The accessible name of the group. */
  label: string
}

/** One of a few views or modes, side by side: list or grid, day or week. */
export function ToggleGroup({ options, value, onChange, label }: ToggleGroupProps) {
  return (
    <ShadcnToggleGroup type="single" variant="outline" value={value ?? ''} onValueChange={next => next && onChange(next)} aria-label={label}>
      {options.map(option => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.icon ? option.label : undefined}>
          {option.icon ?? option.label}
        </ToggleGroupItem>
      ))}
    </ShadcnToggleGroup>
  )
}
