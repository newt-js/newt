import { Combobox as ShadcnCombobox } from '../../shadcn/combobox'
import { ComboboxContent }            from '../../shadcn/combobox'
import { ComboboxEmpty }              from '../../shadcn/combobox'
import { ComboboxInput }              from '../../shadcn/combobox'
import { ComboboxItem }               from '../../shadcn/combobox'
import { ComboboxList }               from '../../shadcn/combobox'
import type { Option }                from '../select/select'
import { useControlProps }            from '../field/field-control'

type ComboboxProps = {
  options: Option[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string | undefined
  /** What it says when nothing matches what was typed. */
  empty?: string
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  /** The accessible name, for a combobox outside a `Field`. */
  label?: string
}

/** One of many options, found by typing: a client among hundreds, a country. For a few, a `Select`. */
export function Combobox({ options, value, onChange, placeholder, empty = 'Nothing matches', disabled, invalid, label }: ComboboxProps) {
  const control = useControlProps(invalid, label)
  const labelOf = (option: string) => options.find(each => each.value === option)?.label ?? option
  return (
    <ShadcnCombobox items={options.map(option => option.value)} value={value} onValueChange={next => onChange(next as string | null)} itemToStringLabel={item => labelOf(item as string)} disabled={disabled}>
      <ComboboxInput {...control} placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => <ComboboxItem key={item} value={item}>{labelOf(item)}</ComboboxItem>}
        </ComboboxList>
      </ComboboxContent>
    </ShadcnCombobox>
  )
}
