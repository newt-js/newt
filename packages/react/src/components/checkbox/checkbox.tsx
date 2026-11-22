import { useId }                      from 'react'
// --------------------------------------------------------
import { Checkbox as ShadcnCheckbox } from '../../shadcn/checkbox'
import { Label }                      from '../../shadcn/label'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** What it says yes to, beside it. */
  label: string
  /** Only for a screen reader, as in a row of a table. */
  labelHidden?: boolean
  disabled?: boolean
}

/** A yes or no that a form sends. For a setting that applies at once, a `Switch`. */
export function Checkbox({ checked, onChange, label, labelHidden = false, disabled }: CheckboxProps) {
  const id = useId()
  const box = <ShadcnCheckbox id={id} checked={checked} disabled={disabled} aria-label={labelHidden ? label : undefined} onCheckedChange={state => onChange(state === true)} />
  if (labelHidden) return box
  return (
    <div className="flex items-center gap-2">
      {box}
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}
