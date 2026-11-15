import { now }               from '../../clock/now/now'
import { allOf }             from '../../criteria/all-of/all-of'
import { Criteria }          from '../../criteria/criteria/criteria'
import { EntitySchema }      from '../../entity/entity-schema'
import { Entity }            from '../../entity/entity/entity'
import { forRepository }     from '../../entity/for-repository/for-repository'
import { Page }              from '../../pagination/page'
import { PageRequest }       from '../../pagination/page-request'
import { toPage }            from '../../pagination/to-page/to-page'
import { BaseRepository }    from '../base-repository/base-repository'
import { ReadOptions }       from '../read-options'
import { FindOptions }       from '../records/find-options'
import { NewRow }            from '../records/new-row'
import { Records }           from '../records/records'
import { RowCount }          from '../records/row-count'
import { StoredRow }         from '../records/stored-row'
import { RepositoryDeps }    from '../repository-deps'
import { RepositoryOptions } from '../repository-options'
import { SaveHooks }         from '../save-hooks'

type SoftDeletedRow = StoredRow & { deletedAt: string | null, updatedAt: string }

const NOT_DELETED: Criteria<SoftDeletedRow> = Object.freeze({ deletedAt: null })

export abstract class Repository<
  E extends Entity<EntitySchema>,
  Row extends StoredRow,
  D extends RepositoryDeps = RepositoryDeps,
> extends BaseRepository<E, D> {

  constructor(deps: D, protected readonly records: Records<Row>, private readonly options: RepositoryOptions<Row>) {
    super(deps)
  }

  protected abstract toEntity(row: Row): E

  protected toRow(entity: E): NewRow<Row> {
    const row = entity[forRepository].storedFields() as Record<string, unknown>
    return (this.options.softDelete ? { ...row, deletedAt: null } : row) as NewRow<Row>
  }

  protected toChanges(entity: E): Partial<NewRow<Row>> {
    const changes = Object.entries(entity.getChanges() ?? {}).map(([field, value]) => [field, value === undefined ? null : value])
    const row: Record<string, unknown> = { ...Object.fromEntries(changes), updatedAt: entity[forRepository].storedFields().updatedAt }
    return row as Partial<NewRow<Row>>
  }

  async find(criteria: Criteria<Row> = {}, options: ReadOptions<Row> = {}): Promise<E[]> {
    const { everyScope, ...findOptions } = options
    const rows = await this.records.find(this.visible(criteria, everyScope), findOptions)
    return rows.map(row => this.toEntity(row))
  }

  count(criteria?: Criteria<Row>, options?: { everyScope?: boolean | undefined }): Promise<number>
  count<K extends keyof Row & string>(criteria: Criteria<Row> | undefined, options: { by: readonly K[], everyScope?: boolean | undefined }): Promise<RowCount<Row, K>[]>
  count<K extends keyof Row & string>(criteria: Criteria<Row> = {}, options: { by?: readonly K[], everyScope?: boolean | undefined } = {}): Promise<number | RowCount<Row, K>[]> {
    const visible = this.visible(criteria, options.everyScope)
    return options.by ? this.records.countBy(visible, options.by) : this.records.count(visible)
  }

  async paginate(criteria: Criteria<Row>, page: PageRequest, options: { newestFirst?: boolean | undefined, everyScope?: boolean | undefined } = {}): Promise<Page<E>> {
    const { newestFirst, everyScope } = options
    const next = page.cursor ? allOf(criteria, { id: { [newestFirst ? 'lt' : 'gt']: page.cursor } } as Criteria<Row>) : criteria
    const orderBy = newestFirst ? [{ field: 'id', direction: 'desc' }] as FindOptions<Row>['orderBy'] : undefined
    const [entities, total] = await Promise.all([
      this.find(next, { limit: page.size + 1, orderBy, everyScope }),
      this.count(criteria, { everyScope }),
    ])
    return toPage(entities, { size: page.size, cursor: entity => entity.id, total })
  }

  async purge(criteria: Criteria<Row>): Promise<number> {
    let removed = 0
    await this.saveRows(async () => {
      removed = await this.records.deleteMany(criteria)
    })
    return removed
  }

  async persist(entities: E | readonly E[], hooks?: SaveHooks): Promise<void> {
    await this.save(Array.isArray(entities) ? [...entities] : [entities as E], entity => this.write(entity), hooks)
  }

  protected async write(entity: E): Promise<void> {
    this.assertInScope(entity)
    if (entity.isNew) {
      return this.records.insert(this.toRow(entity))
    }
    if (entity.isDeleted) {
      if (!this.options.softDelete) {
        return this.records.delete(entity.id, entity.version)
      }
      const at = now().toISOString()
      const stamp: Partial<NewRow<SoftDeletedRow>> = { deletedAt: at, updatedAt: at }
      return this.records.update(entity.id, entity.version, stamp as Partial<NewRow<Row>>)
    }
    return this.records.update(entity.id, entity.version, this.toChanges(entity))
  }

  private visible(criteria: Criteria<Row>, everyScope = false): Criteria<Row> {
    const { softDelete, scope } = this.options
    const scoped = scope !== 'none' && !everyScope ? allOf(criteria, { [scope.field]: scope.current() } as Criteria<Row>) : criteria
    return softDelete ? allOf(scoped, NOT_DELETED as Criteria<Row>) : scoped
  }

  private assertInScope(entity: E): void {
    const { scope } = this.options
    if (scope === 'none') {
      return
    }
    const value = (entity[forRepository].storedFields() as Record<string, unknown>)[scope.field]
    const stored = entity.isNew ? value : (entity[forRepository].savedState().initial as Record<string, unknown>)[scope.field]
    for (const each of [value, stored]) {
      if (each !== scope.current()) {
        throw new Error(`${entity.constructor.name} ${entity.id} belongs to ${scope.field} '${String(each)}', not to the current one: a repository saves only its scope's`)
      }
    }
  }
}
