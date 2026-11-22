import { Select as ShadcnSelect } from '../../shadcn/select'
import { SelectContent }          from '../../shadcn/select'
import { SelectItem }             from '../../shadcn/select'
import { SelectTrigger }          from '../../shadcn/select'
import { SelectValue }            from '../../shadcn/select'
import { useControlProps }        from '../field/field-control'

export type Option = {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  /** Shown while nothing is chosen. */
  placeholder?: string | undefined
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  name?: string
  /** The accessible name, for a select outside a `Field`. */
  label?: string
  /** `compact`: as wide as its value and short, for a filter in a toolbar. */
  size?: 'full' | 'compact'
}

/** One of a few options. For many, a `Combobox`, which searches them. */
export function Select({ options, value, onChange, placeholder, disabled, invalid, name, label, size = 'full' }: SelectProps) {
  const control = useControlProps(invalid, label)
  const compact = size === 'compact'
  return (
    <ShadcnSelect value={value ?? ''} onValueChange={onChange} disabled={disabled} name={name}>
      <SelectTrigger {...control} size={compact ? 'sm' : 'default'} className={compact ? 'w-auto' : 'w-full'}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}
      </SelectContent>
    </ShadcnSelect>
  )
}
