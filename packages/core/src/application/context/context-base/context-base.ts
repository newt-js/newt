import type { Clock }              from '../../../domain/clock/clock'
import { systemClock }             from '../../../domain/clock/system-clock/system-clock'
import type { ContextStorage }     from '../../../domain/file-storage/files/context-storage'
import type { RepositoryDeps }     from '../../../domain/repository/repository-deps'
import type { Transactions }       from '../../../domain/repository/transactions/transactions'
import { UseCaseRunner }           from '../../../domain/use-case/use-case-runner/use-case-runner'
import type { Database }           from '../../database/database'
import { observedBy }              from '../../platform/observed-by/observed-by'
import { Platform }                from '../../platform/platform/platform'
import { RateLimits }              from '../../runtime/rate-limits/rate-limits/rate-limits'
import { Schedules }               from '../../runtime/schedules/schedules/schedules'
import { Worker }                  from '../../runtime/worker/worker/worker'
import { ContextBus }              from '../context-bus/context-bus'
import { contextStorage }          from '../context-storage/context-storage'
import { jobsChannel }             from '../jobs-channel/jobs-channel'
import type { ContextBaseOptions } from './context-base-options'

export class ContextBase implements RepositoryDeps {

  readonly name: string
  readonly platform: Platform
  readonly clock: Clock
  readonly database: Database
  readonly transactions: Transactions
  readonly useCaseRunner: UseCaseRunner
  readonly bus: ContextBus
  readonly worker: Worker
  readonly schedules: Schedules
  readonly rateLimits: RateLimits
  readonly storage: ContextStorage
  private readonly unwatch: () => void

  constructor(options: ContextBaseOptions) {
    if (options.name.includes(':')) {
      throw new Error(`A context's name has no ':', ${options.name}: its rate limits' keys begin with it and a ':', so another context's could be the same`)
    }
    const clock = this.clock = options.clock ?? systemClock
    this.name = options.name
    this.platform = options.platform
    this.database = options.database
    this.transactions = options.database
    this.useCaseRunner = new UseCaseRunner({
      context: options.name,
      observability: observedBy(this.platform),
      writeRule: options.writeRule,
      guardRule: options.guardRule,
      clock,
      conflictRetries: options.conflictRetries,
    })
    this.worker = new Worker(this.database.outbox, this.useCaseRunner, this.platform, options.worker, clock)
    this.unwatch = this.platform.cluster.subscribe(jobsChannel(this.name), () => this.worker.wake())
    this.bus = new ContextBus({ name: this.name, database: this.database, worker: this.worker, registry: this.useCaseRunner.registry, platform: this.platform, clock })
    this.schedules = new Schedules(this.database, this.bus, this.useCaseRunner, this.platform, clock)
    this.storage = contextStorage(options.storage, options.name)
    this.rateLimits = new RateLimits(this.platform.cluster, options.name, clock)
  }

  async close(): Promise<void> {
    this.unwatch()
    await this.database.close()
  }
}
