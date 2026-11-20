import type { EntitySchema }   from '../../entity/entity-schema'
import { Entity }              from '../../entity/entity/entity'
import { forRepository }       from '../../entity/for-repository/for-repository'
import type { RepositoryDeps } from '../repository-deps'
import type { SaveHooks }      from '../save-hooks'

/**
 * `<context>.<module>.<name>`: a guard's key is shared by the whole database, so it says whose it is.
 * The name may carry what it guards, as `shop.column.board:42`.
 */
const GUARD_KEY = /^[a-z][a-z0-9-]*\.[a-z][a-zA-Z0-9]*\.[^.\s]+$/

export abstract class BaseRepository<E extends Entity<EntitySchema>, D extends RepositoryDeps = RepositoryDeps> {

  constructor(protected readonly deps: D) {}

  protected async save<T extends E>(entities: T[], write: (entity: T) => void | Promise<void>, hooks: SaveHooks = {}): Promise<void> {
    this.deps.useCaseRunner?.checkWriteRule()
    for (const entity of entities) {
      entity[forRepository].assertSavable()
    }
    const changed = new Set(entities.filter(entity => entity.hasPendingChanges))
    await this.saving(hooks.guard, async () => {
      const saved = entities.map(entity => ({ entity, state: entity[forRepository].savedState() }))
      this.deps.transactions.afterRollback(() => {
        for (const { entity, state } of saved) {
          entity[forRepository].restoreSaved(state)
        }
      })
      await hooks.before?.()
      for (const entity of changed) {
        await write(entity)
        entity[forRepository].markPersisted()
      }
      await hooks.after?.()
      for (const entity of entities) {
        const events = entity[forRepository].takeEvents()
        if (!changed.has(entity)) {
          continue
        }
        for (const event of events) {
          await this.deps.bus.publish(event)
        }
      }
    })
  }

  protected async saveRows(write: () => void | Promise<void>, options: { guard?: string[] | undefined } = {}): Promise<void> {
    this.deps.useCaseRunner?.checkWriteRule()
    await this.saving(options.guard, write)
  }

  private async saving(guard: string[] = [], fn: () => void | Promise<void>): Promise<void> {
    const misnamed = guard.find(key => !GUARD_KEY.test(key))
    if (misnamed !== undefined) {
      throw new Error(`A guard is named <context>.<module>.<name>, as auth.user.setup: ${misnamed}`)
    }
    await this.deps.transactions.save(async save => {
      this.deps.useCaseRunner?.checkOneModulePerTransaction(save.modules)
      await this.deps.useCaseRunner?.receive()
      if (guard.length) {
        await this.deps.transactions.guard(guard)
      }
      await fn()
      if (guard.length === 0 && save.read.size > 0) {
        this.deps.useCaseRunner?.checkGuardRule([...save.read])
      }
    })
  }
}
