import type { FieldIssue } from './field-issue'

/**
 * A failed request: the backend's status, message and error `code`. Status 0 is no answer at all. When the input
 * was not valid (400, code `validation`), `issues` says what was wrong with which field.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly issues: FieldIssue[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
