import { createContext } from 'react'
import { useContext }    from 'react'

/** What a `Field` hands the control inside it, so its label, help and error are read with it. */
export type FieldControl = {
  id: string
  /** The ids of the description and the error, when they are shown. */
  describedBy: string | undefined
  invalid: boolean
}

export const FieldContext = createContext<FieldControl | null>(null)

/** The attributes that tie a control to its `Field`, or name it on its own with `label`. */
export function useControlProps(invalid: boolean | undefined, label: string | undefined) {
  const field = useContext(FieldContext)
  return {
    'id': field?.id,
    'aria-describedby': field?.describedBy,
    'aria-invalid': invalid || field?.invalid || undefined,
    'aria-label': label,
  }
}
