import { ConflictError } from '../../../../../domain/errors/conflict-error/conflict-error'

export class IdempotencyAnswerNotKept extends ConflictError<{ status: number }> {
  readonly code = 'idempotency_answer_not_kept'
  constructor(status: number) {
    super(`The request with this Idempotency-Key was done (${status}), but its answer was not kept (too long, or a stream): it is not done again`, { status })
  }
}
