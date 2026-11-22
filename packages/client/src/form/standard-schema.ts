/**
 * What a form validates with: any schema of the Standard Schema spec (https://standardschema.dev), which zod,
 * valibot and arktype all are. The app chooses the library; newt only asks this much of it.
 */
export type StandardSchema<INPUT, OUTPUT = INPUT> = {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => StandardResult<OUTPUT> | Promise<StandardResult<OUTPUT>>
    readonly types?: { readonly input: INPUT, readonly output: OUTPUT } | undefined
  }
}

type StandardResult<OUTPUT> =
  | { readonly value: OUTPUT, readonly issues?: undefined }
  | { readonly issues: readonly StandardIssue[] }

type StandardIssue = {
  readonly message: string
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined
}

/** The issues of a failed validation, as `field: message`, the first message of each field. */
export function errorsOf(issues: readonly StandardIssue[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = (issue.path ?? []).map(part => String(typeof part === 'object' ? part.key : part)).join('.')
    errors[field] ??= issue.message
  }
  return errors
}
