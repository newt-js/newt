import type { ReactNode }       from 'react'
// --------------------------------------------------------
import { Input as ShadcnInput } from '../../shadcn/input'
import { InputGroup }           from '../../shadcn/input-group'
import { InputGroupAddon }      from '../../shadcn/input-group'
import { InputGroupInput }      from '../../shadcn/input-group'
import { useControlProps }      from '../field/field-control'

type InputProps = {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'url' | 'tel'
  placeholder?: string | undefined
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  name?: string
  autoComplete?: string | undefined
  /** An icon before the text, such as a lens for a search. */
  icon?: ReactNode
  /** The accessible name, for an input outside a `Field`. */
  label?: string
}

/** One line of text. */
export function Input({ value, onChange, type = 'text', placeholder, disabled, invalid, name, autoComplete, icon, label }: InputProps) {
  const control = useControlProps(invalid, label)
  const props = { ...control, type, value, placeholder, disabled, name, autoComplete, onChange: (event: { target: { value: string } }) => onChange(event.target.value) }
  if (icon === undefined) return <ShadcnInput {...props} />
  return (
    <InputGroup>
      <InputGroupAddon>{icon}</InputGroupAddon>
      <InputGroupInput {...props} />
    </InputGroup>
  )
}
