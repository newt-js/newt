import { Textarea as ShadcnTextarea } from '../../shadcn/textarea'
import { useControlProps }            from '../field/field-control'

type TextareaProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string | undefined
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  name?: string
  /** The lines it shows at least. */
  rows?: number
  /** The accessible name, for a textarea outside a `Field`. */
  label?: string
}

/** Text of several lines. */
export function Textarea({ value, onChange, placeholder, disabled, invalid, name, rows, label }: TextareaProps) {
  const control = useControlProps(invalid, label)
  return <ShadcnTextarea {...control} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} name={name} rows={rows} />
}
