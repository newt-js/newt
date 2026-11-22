import type { ReactNode }         from 'react'
// --------------------------------------------------------
import { Toggle as ShadcnToggle } from '../../shadcn/toggle'

type ToggleProps = {
  pressed: boolean
  onChange: (pressed: boolean) => void
  /** The accessible name, when the content is an icon. */
  label?: string
  disabled?: boolean
  children: ReactNode
}

/** A button that stays pressed or not: bold in an editor, a view that is on. */
export function Toggle({ pressed, onChange, label, disabled, children }: ToggleProps) {
  return <ShadcnToggle pressed={pressed} onPressedChange={onChange} aria-label={label} disabled={disabled}>{children}</ShadcnToggle>
}
