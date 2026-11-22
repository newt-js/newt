import type { ReactNode }             from 'react'
import { useId }                      from 'react'
import { useMemo }                    from 'react'
// --------------------------------------------------------
import { Field as ShadcnField }       from '../../shadcn/field'
import { FieldDescription }           from '../../shadcn/field'
import { FieldError }                 from '../../shadcn/field'
import { FieldLabel }                 from '../../shadcn/field'
import { FieldContext }               from './field-control'

type FieldProps = {
  label: ReactNode
  /** Help under the control. */
  description?: ReactNode
  /** When there is one, the control is marked wrong and this is read with it. */
  error?: ReactNode
  /** One control: `Input`, `Textarea`, `Select`, `Combobox`, `DatePicker`, `Slider`, `InputOTP`… */
  children: ReactNode
}

/** A control with its label, its help and its error: every control of a form goes in one. */
export function Field({ label, description, error, children }: FieldProps) {
  const id = useId()
  const hasDescription = description !== undefined && description !== null
  const hasError = error !== undefined && error !== null && error !== false && error !== ''
  const describedBy = [hasDescription && `${id}-description`, hasError && `${id}-error`].filter(Boolean).join(' ') || undefined
  const control = useMemo(() => ({ id: `${id}-control`, describedBy, invalid: hasError }), [id, describedBy, hasError])
  return (
    <ShadcnField data-invalid={hasError || undefined}>
      <FieldLabel htmlFor={control.id}>{label}</FieldLabel>
      <FieldContext.Provider value={control}>{children}</FieldContext.Provider>
      {hasDescription && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {hasError && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </ShadcnField>
  )
}
