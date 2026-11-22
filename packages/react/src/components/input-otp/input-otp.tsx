import { InputOTP as ShadcnInputOTP } from '../../shadcn/input-otp'
import { InputOTPGroup }              from '../../shadcn/input-otp'
import { InputOTPSlot }               from '../../shadcn/input-otp'
import { useControlProps }            from '../field/field-control'

type InputOTPProps = {
  value: string
  onChange: (value: string) => void
  /** How many characters the code has. */
  length?: number
  disabled?: boolean
  /** Marks the value as wrong. Inside a `Field`, its `error` does it. */
  invalid?: boolean
  /** The accessible name, for a code outside a `Field`. */
  label?: string
}

/** A one-time code, one box per character. */
export function InputOTP({ value, onChange, length = 6, disabled, invalid, label }: InputOTPProps) {
  const control = useControlProps(invalid, label)
  return (
    <ShadcnInputOTP {...control} maxLength={length} value={value} onChange={onChange} disabled={disabled} autoComplete="one-time-code">
      <InputOTPGroup>
        {Array.from({ length }, (_, index) => <InputOTPSlot key={index} index={index} />)}
      </InputOTPGroup>
    </ShadcnInputOTP>
  )
}
