import { useId }                  from 'react'
// --------------------------------------------------------
import { Label }                  from '../../shadcn/label'
import { Switch as ShadcnSwitch } from '../../shadcn/switch'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** What it turns on, beside it. */
  label: string
  disabled?: boolean
}

/** On or off, at once: a setting. For a yes a form sends, a `Checkbox`. */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <ShadcnSwitch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}
