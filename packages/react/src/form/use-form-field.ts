import type { FormStore } from '@newt-js/client'
import { useCallback }    from 'react'
// --------------------------------------------------------
import { useValue }       from '../use-value/use-value'

/**
 * One field of a `FormStore`, ready for a control and its `Field`:
 * `<Field label="Name" error={name.error}><Input {...name.control} /></Field>`.
 */
export function useFormField<VALUES extends Record<string, unknown>, FIELD extends keyof VALUES & string>(form: Pick<FormStore<VALUES>, 'values' | 'errors' | 'set'>, field: FIELD) {
  const values = useValue(form.values)
  const errors = useValue(form.errors)
  const onChange = useCallback((value: VALUES[FIELD]) => form.set(field, value), [form, field])
  return { control: { value: values[field], onChange }, error: errors[field] }
}
