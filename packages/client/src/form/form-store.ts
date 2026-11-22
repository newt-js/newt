import type { ReadonlySignal } from '@preact/signals-core'
// --------------------------------------------------------
import { ApiError }            from '../http/api-error'
import { Store }               from '../store/store'
import type { StandardSchema } from './standard-schema'
import { errorsOf }            from './standard-schema'

type FormState<VALUES> = {
  values: VALUES
  /** What is wrong, by field (`address.city`); `''` for what is wrong with the whole form. */
  errors: Record<string, string>
  submitting: boolean
}

/**
 * A form's values, what is wrong with them, and whether it is being sent. It lives in a feature's service, as a
 * field: `readonly form = new FormStore(clientSchema, { name: '' })`. It checks the values with the schema before
 * sending them, and shows by each field what the backend said was wrong.
 */
export class FormStore<VALUES extends Record<string, unknown>, OUTPUT = VALUES> {

  private readonly store: Store<FormState<VALUES>>
  readonly values: ReadonlySignal<VALUES>
  readonly errors: ReadonlySignal<Record<string, string>>
  readonly submitting: ReadonlySignal<boolean>

  constructor(private readonly schema: StandardSchema<VALUES, OUTPUT>, initial: VALUES) {
    this.store = new Store<FormState<VALUES>>({ values: initial, errors: {}, submitting: false })
    this.values = this.store.select('values')
    this.errors = this.store.select('errors')
    this.submitting = this.store.select('submitting')
  }

  /** Changes one value, and forgets what was wrong with it. */
  set<FIELD extends keyof VALUES & string>(field: FIELD, value: VALUES[FIELD]): void {
    this.store.update(({ values, errors }) => {
      const { [field]: _, '': __, ...rest } = errors
      return { values: { ...values, [field]: value }, errors: rest }
    })
  }

  /** Puts every value back, as when editing another thing. */
  fill(values: VALUES): void {
    this.store.patch({ values, errors: {} })
  }

  reset(): void {
    this.store.reset()
  }

  /**
   * Checks the values and, if they are right, sends them with `send`. What the schema or the backend found wrong
   * goes by its field; any other failure of the backend, under `''`. Gives what `send` gave, or `null`.
   */
  async submit<RESULT>(send: (values: OUTPUT) => Promise<RESULT>): Promise<RESULT | null> {
    if (this.store.value.submitting) return null
    const checked = await this.schema['~standard'].validate(this.store.value.values)
    if (checked.issues) {
      this.store.patch({ errors: errorsOf(checked.issues) })
      return null
    }
    this.store.patch({ submitting: true, errors: {} })
    try {
      return await send(checked.value)
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      const byField = Object.fromEntries(error.issues.map(issue => [issue.field, issue.message]))
      this.store.patch({ errors: error.issues.length > 0 ? byField : { '': error.message } })
      return null
    } finally {
      this.store.patch({ submitting: false })
    }
  }
}
