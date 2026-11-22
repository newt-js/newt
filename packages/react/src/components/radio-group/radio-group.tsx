import { useId }                          from 'react'
// --------------------------------------------------------
import { Label }                          from '../../shadcn/label'
import { RadioGroup as ShadcnRadioGroup } from '../../shadcn/radio-group'
import { RadioGroupItem }                 from '../../shadcn/radio-group'
import type { Option }                    from '../select/select'
import { useControlProps }                from '../field/field-control'

type RadioGroupProps = {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  /** The accessible name, for a group outside a `Field`. */
  label?: string
}

/** One of a few options, all in sight: for two to five that a person should compare. */
export function RadioGroup({ options, value, onChange, disabled, invalid, label }: RadioGroupProps) {
  const id = useId()
  const control = useControlProps(invalid, label)
  return (
    <ShadcnRadioGroup {...control} value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      {options.map(option => (
        <div key={option.value} className="flex items-center gap-2">
          <RadioGroupItem id={`${id}-${option.value}`} value={option.value} disabled={option.disabled} />
          <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </ShadcnRadioGroup>
  )
}
