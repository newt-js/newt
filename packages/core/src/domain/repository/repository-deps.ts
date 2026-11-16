import type { EventPublisher } from '../events/bus/event-publisher'
import { UseCaseRunner }       from '../use-case/use-case-runner/use-case-runner'
import type { Transactions }   from './transactions/transactions'

export type RepositoryDeps = {
  readonly transactions: Transactions
  readonly bus: EventPublisher
  readonly useCaseRunner?: UseCaseRunner | undefined
}
