import { ValidationError }  from '../../../errors/validation-error/validation-error'
import type { FilterIssue } from '../filter-issue'

export class InvalidSort extends ValidationError<{ issues: FilterIssue[] }> {
  readonly code = 'invalid_sort'
  constructor(issues: FilterIssue[]) {
    super(`The sort is not valid: ${issues.map(issue => issue.path ? `${issue.path}: ${issue.message}` : issue.message).join('; ')}`, { issues })
  }
}
