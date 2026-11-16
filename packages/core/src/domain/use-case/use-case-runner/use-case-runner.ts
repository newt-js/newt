import type { Clock }           from '../../clock/clock'
import { clockScope }           from '../../clock/clock-scope/clock-scope'
import { ConcurrencyConflict }  from '../../errors/concurrency-conflict/concurrency-conflict'
import { DuplicateValue }       from '../../errors/duplicate-value/duplicate-value'
import { noObservability }      from '../../observability/no-observability/no-observability'
import type { Observability }   from '../../observability/observability'
import type { UseCaseAttempt }  from '../../observability/use-case-attempt'
import { ContextRegistry }      from '../../registry/context-registry/context-registry'
import type { ConflictRetries } from '../conflict-retries/conflict-retries'
import { conflictRetries }      from '../conflict-retries/conflict-retries'
import type { GuardRule }       from '../guard-rule'
import { sleep }                from '../sleep/sleep'
import { useCaseChainScope }    from '../use-case-chain-scope/use-case-chain-scope'
import type { UseCaseOptions }  from '../use-case-options'
import { workerScope }          from '../worker-scope/worker-scope'
import type { WriteRule }       from '../write-rule'

export type UseCaseRunnerOptions = {
  context?: string | undefined
  observability?: Observability | undefined
  writeRule?: WriteRule | undefined
  guardRule?: GuardRule | undefined
  clock?: Clock | undefined
  conflictRetries?: Partial<ConflictRetries> | undefined
}

export class UseCaseRunner {

  readonly registry: ContextRegistry
  readonly context: string
  private readonly observability: Observability
  private readonly writeRule: WriteRule
  private readonly guardRule: GuardRule
  private readonly clock: Clock | undefined
  private readonly retries: ConflictRetries
  private readonly warned = new Set<string>()

  constructor(options: UseCaseRunnerOptions = {}) {
    this.context = options.context ?? ''
    this.observability = options.observability ?? noObservability
    this.writeRule = options.writeRule ?? 'error'
    this.guardRule = options.guardRule ?? 'error'
    this.clock = options.clock
    this.retries = conflictRetries(options.conflictRetries)
    this.registry = new ContextRegistry(this.context)
  }

  run<T>(name: string, fn: () => Promise<T>, options?: UseCaseOptions): Promise<T> {
    const module = name.split('.')[0]!
    const link = { context: this.context, module, useCase: name }
    const chain = useCaseChainScope.get()
    const root = chain && chain.root.context === link.context ? chain.root : link
    const retry = chain?.retry ?? { allowed: true }
    if (options?.retryOnConflict === false) {
      retry.allowed = false
    }
    const invoke = () => useCaseChainScope.run({ root, current: link, retry }, () =>
      this.observability.useCase({ name, module, context: this.context }, attempt => this.runs(fn, chain ? undefined : retry, attempt)))
    return this.clock ? clockScope.run(this.clock, invoke) : invoke()
  }

  checkWriteRule(): void {
    const chain = useCaseChainScope.get()
    if (this.writeRule === 'off' || !chain || workerScope.get()) {
      return
    }
    const { root, current } = chain
    if (root.module === current.module) {
      return
    }
    const module = current.context ? `${current.context}.${current.module}` : current.module
    this.broken(this.writeRule, `${root.useCase}>${module}`, `[write rule] ${root.useCase} writes to ${module} outside a worker: write it from a worker reacting to an event`, { useCase: root.useCase, module })
  }

  checkOneModulePerTransaction(saved: Set<string>): void {
    const chain = useCaseChainScope.get()
    if (this.writeRule === 'off' || !chain) {
      return
    }
    const { root, current } = chain
    const module = current.context ? `${current.context}.${current.module}` : current.module
    const others = [...saved].filter(each => each !== module)
    saved.add(module)
    if (others.length === 0) {
      return
    }
    const message = `[write rule] ${root.useCase} saves ${module} in the transaction that saved ${others.join(', ')}: one module per transaction; save it after that one commits, from a worker reacting to an event`
    this.broken(this.writeRule, message, message, { useCase: root.useCase, module, saved: others })
  }

  checkGuardRule(tables: string[]): void {
    if (this.guardRule === 'off') {
      return
    }
    const useCase = useCaseChainScope.get()?.current.useCase ?? 'a save outside any use case'
    const message = `[guard rule] ${useCase} reads ${tables.join(', ')} in a save that guards nothing: on Postgres another save may change what it read before it commits. Name what its rule protects in the save's guard`
    this.broken(this.guardRule, message, message, { useCase, tables })
  }

  private broken(rule: 'warn' | 'error', key: string, message: string, fields: Record<string, unknown>): void {
    if (rule === 'error') {
      throw new Error(message)
    }
    if (this.warned.has(key)) {
      return
    }
    this.warned.add(key)
    this.observability.warn(message, fields)
  }

  private async runs<T>(fn: () => Promise<T>, retry: { allowed: boolean } | undefined, attempt: UseCaseAttempt): Promise<T> {
    for (let run = 0, duplicates = 0; ; run++) {
      try {
        return await fn()
      } catch (error) {
        if (!retry?.allowed || !(error instanceof ConcurrencyConflict) || run === this.retries.times) {
          throw error
        }
        if (error instanceof DuplicateValue && duplicates++ === this.retries.duplicates) {
          throw error
        }
        attempt.retrying(error, run + 1)
        await sleep(Math.random() * this.retries.backoffMs * (run + 1))
      }
    }
  }
}
