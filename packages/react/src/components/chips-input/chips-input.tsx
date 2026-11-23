import { useState }               from 'react'
// --------------------------------------------------------
import { Combobox as ShadcnCombobox } from '../../shadcn/combobox'
import { ComboboxChip }               from '../../shadcn/combobox'
import { ComboboxChips }              from '../../shadcn/combobox'
import { ComboboxChipsInput }         from '../../shadcn/combobox'
import { useControlProps }            from '../field/field-control'

type ChipsInputProps = {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string | undefined
  /** Splits what is typed or pasted: by spaces and lines by default. A comma, when a value never holds one. */
  separator?: RegExp
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  /** The accessible name, for one outside a `Field`. */
  label?: string
}

/**
 * Values typed freely, each a chip: Enter, a separator or leaving the field adds what is written; Backspace on an
 * empty field or a chip's × takes one away. Never twice the same. For values chosen among options, a `Combobox`.
 */
export function ChipsInput({ value, onChange, placeholder, separator = /\s+/, disabled, invalid, label }: ChipsInputProps) {
  const control = useControlProps(invalid, label)
  const [text, setText] = useState('')
  const add = (written: string) => {
    const fresh = written.split(separator).map(each => each.trim()).filter(each => each !== '' && !value.includes(each))
    if (fresh.length > 0) {
      onChange([...value, ...new Set(fresh)])
    }
    setText('')
  }
  const type = (next: string) => {
    // A separator typed or pasted closes what came before it; what follows the last one stays written.
    const parts = next.split(separator)
    if (parts.length > 1) {
      add(parts.slice(0, -1).join(' '))
    }
    setText(parts.at(-1) ?? '')
  }
  return (
    <ShadcnCombobox
      multiple
      items={value}
      value={value}
      onValueChange={next => onChange(next as string[])}
      inputValue={text}
      onInputValueChange={type}
      disabled={disabled}
    >
      <ComboboxChips>
        {value.map(each => <ComboboxChip key={each}>{each}</ComboboxChip>)}
        <ComboboxChipsInput
          {...control}
          placeholder={value.length === 0 ? placeholder : undefined}
          onKeyDown={event => {
            if (event.key === 'Enter' && text.trim() !== '') {
              event.preventDefault()
              add(text)
            }
          }}
          onBlur={() => add(text)}
        />
      </ComboboxChips>
    </ShadcnCombobox>
  )
}
