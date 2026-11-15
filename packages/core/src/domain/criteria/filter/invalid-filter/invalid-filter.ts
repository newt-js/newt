import { ValidationError } from '../../../errors/validation-error/validation-error'
import { FilterIssue }     from '../filter-issue'

export class InvalidFilter extends ValidationError<{ issues: FilterIssue[] }> {
  readonly code = 'invalid_filter'
  constructor(issues: FilterIssue[]) {
    super(`The filter is not valid: ${issues.map(issue => issue.path ? `${issue.path}: ${issue.message}` : issue.message).join('; ')}`, { issues })
  }
}
