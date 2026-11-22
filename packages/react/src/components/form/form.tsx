import type { FormStore }  from '@newt-js/client'
import type { ReactNode }  from 'react'
// --------------------------------------------------------
import { useValue }        from '../../use-value/use-value'
import { Alert }           from '../alert/alert'

type FormProps = {
  /** The form's store: what is wrong with the whole of it shows at the top. */
  form: Pick<FormStore<Record<string, unknown>>, 'errors'>
  /** What sending it does: usually a method of the service that calls `form.submit`. */
  onSubmit: () => void
  /** Its `Field`s, and the `Button type="submit"` at the end. */
  children: ReactNode
}

/** A form: Enter in a field sends it, as its submit button does, and the browser checks nothing on its own. */
export function Form({ form, onSubmit, children }: FormProps) {
  const errors = useValue(form.errors)
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault()
      onSubmit()
    }}>
      {errors[''] !== undefined && <Alert tone="bad" title={errors['']} />}
      {children}
    </form>
  )
}
