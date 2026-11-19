import { isDeepStrictEqual }          from 'node:util'
import { ZodError }                   from 'zod'
import { z }                          from 'zod'
// --------------------------------------------------------
import { now as clockNow }            from '../../clock/now/now'
import type { DomainEvent }           from '../../events/event/domain-event'
import type { References }            from '../../module/resolve-reference/resolve-reference'
import type { Resolved }              from '../../module/resolve-reference/resolve-reference'
import { uuidV7 }                     from '../../value-objects/uuid/uuid-v7/uuid-v7'
import type { EntityInput }           from '../entity-input'
import type { EntitySchema }          from '../entity-schema'
import { DeletedEntityNotChangeable } from '../errors/deleted-entity-not-changeable/deleted-entity-not-changeable'
import { EntityAlreadyDeleted }       from '../errors/entity-already-deleted/entity-already-deleted'
import { EventWithoutChange }         from '../errors/event-without-change/event-without-change'
import { InvalidEntity }              from '../errors/invalid-entity/invalid-entity'
import { NewEntityNotDeletable }      from '../errors/new-entity-not-deletable/new-entity-not-deletable'
import { SaveRolledBack }             from '../errors/save-rolled-back/save-rolled-back'
import { UnknownEntityField }         from '../errors/unknown-entity-field/unknown-entity-field'
import { forRepository }              from '../for-repository/for-repository'
import type { EntityReferences }      from '../references/entity-references'
import { keptOf }                     from '../references/entity-references'
import { shownOf }                    from '../references/entity-references'
import type { RepositoryAccess }      from '../repository-access'
import type { SavedState }            from '../saved-state'
import { checkEntitySchema }          from '../schema/check-entity-schema/check-entity-schema'
import { FRAMEWORK_FIELDS }           from '../schema/framework-fields'
import { TIMESTAMP_FIELDS }           from '../schema/framework-fields'
import { optionalOnly }               from '../schema/optional-only/optional-only'

type Fields = Record<string, unknown>

/**
 * An entity: its schema says what it keeps, its public schema what it shows, and its references (`{ customerId:
 * CustomerDTO }`) the entities of other modules it shows in place of the ids it keeps. It is given those entities,
 * `customer`, never their ids alone, so its DTO is always whole.
 */
export class Entity<TSchema extends EntitySchema, TPublic extends EntitySchema = TSchema, TReferences extends References = {}> {
  /** Its references, for the types alone: a repository reads them to know what to load. */
  declare readonly '~references'?: TReferences

  private initial: Fields | null
  private current: Fields
  private _isNew: boolean
  private _version: number
  private readonly publicFields: string[] | undefined
  private readonly references: EntityReferences = new Map()

  private domainEvents: DomainEvent[] = []
  private deletion: 'none' | 'pending' | 'saved' = 'none'
  private changed = false
  private rolledBack = false

  protected constructor(
    protected readonly schema: TSchema,
    input: EntityInput<Resolved<z.infer<TSchema>, TReferences>>,
    isNew: boolean,
    ...[publicSchema]: [TPublic] extends [TSchema] ? [publicSchema?: TPublic] : [publicSchema: TPublic]
  ) {
    const id = input.id ?? uuidV7()
    this.publicFields = checkEntitySchema(new.target, schema, publicSchema)
    if (!isNew && input.version === undefined) {
      throw new Error(`${new.target.name} read from storage comes with its version`)
    }

    const data: Fields = keptOf({ ...input, id }, schema.shape, this.references)
    for (const key of FRAMEWORK_FIELDS) {
      if (!Object.hasOwn(schema.shape, key)) {
        delete data[key]
      }
    }
    if (!isNew) {
      for (const key of Object.keys(data)) {
        if (data[key] === null && optionalOnly(schema.shape[key] as z.ZodType | undefined)) {
          delete data[key]
        }
      }
    }
    const now = isNew ? clockNow().toISOString() : undefined
    if (now) {
      data.createdAt = now
      data.updatedAt = now
    }
    this.current = this.parsed(data, new.target.name, id)

    if (now) {
      this.current.createdAt = now
      this.current.updatedAt = now
    }

    this.initial = isNew ? null : structuredClone(this.current)
    this._isNew = isNew
    this._version = isNew ? 0 : input.version!
  }

  private parsed(data: Fields, entity: string, id: string): Fields {
    try {
      return this.schema.parse(data)
    } catch (error) {
      throw error instanceof ZodError ? new InvalidEntity(entity, id, error) : error
    }
  }

  get isNew(): boolean {
    return this._isNew
  }

  get version(): number {
    return this._version
  }

  get hasPendingChanges(): boolean {
    return this._isNew || this.deletion === 'pending' || this.getChanges() !== null
  }

  get id(): z.infer<TSchema> extends { id: infer Id extends string } ? Id : string {
    return this.current.id as z.infer<TSchema> extends { id: infer Id extends string } ? Id : string
  }

  protected get data(): z.infer<TSchema> {
    return this.current as z.infer<TSchema>
  }

  protected change(partial: Partial<Omit<Resolved<z.infer<TSchema>, TReferences>, 'id'>>): void {
    if (this.deletion !== 'none') {
      throw new DeletedEntityNotChangeable()
    }
    const given = Object.entries(keptOf(partial, this.schema.shape, this.references)).filter(([key]) => key !== 'id')
    for (const [key] of given) {
      if (TIMESTAMP_FIELDS.includes(key)) {
        throw new UnknownEntityField(key, 'the framework keeps it, and a save never stores a change to it')
      }
      if (!Object.hasOwn(this.schema.shape, key)) {
        throw new UnknownEntityField(key)
      }
    }
    const parsed = this.parsed({ ...this.current, ...Object.fromEntries(given) }, this.constructor.name, this.id)

    let mutated = false
    for (const [key] of given) {
      if (!isDeepStrictEqual(this.current[key], parsed[key])) {
        this.current[key] = parsed[key]
        mutated = true
      }
    }
    if (mutated) {
      this.current.updatedAt = clockNow().toISOString()
      this.changed = true
    }
  }

  getChanges(): Partial<z.infer<TSchema>> | null {
    if (this.isNew || this.deletion !== 'none' || !this.initial) {
      return null
    }

    const changes: Fields = {}
    for (const [key, value] of Object.entries(this.current)) {
      if (key === 'id' || TIMESTAMP_FIELDS.includes(key)) {
        continue
      }
      if (!isDeepStrictEqual(this.initial[key], value)) {
        changes[key] = value
      }
    }
    return Object.keys(changes).length ? changes as Partial<z.infer<TSchema>> : null
  }

  getPrevious(): Partial<z.infer<TSchema>> | null {
    const changes = this.getChanges()
    const { initial } = this
    if (!changes || !initial) {
      return null
    }
    return Object.fromEntries(Object.keys(changes).map(key => [key, structuredClone(initial[key])])) as Partial<z.infer<TSchema>>
  }

  hasChanged(field: keyof z.infer<TSchema>): boolean {
    if (this.isNew) {
      return true
    }
    const changes = this.getChanges()
    return changes !== null && field in changes
  }

  toDTO(): Resolved<z.infer<TPublic>, TReferences> {
    const fields = this.publicFields
    const shown = fields ? Object.fromEntries(Object.entries(this.current).filter(([field]) => fields.includes(field))) : this.current
    const shape = fields ? Object.fromEntries(Object.entries(this.schema.shape).filter(([field]) => fields.includes(field))) : this.schema.shape
    return structuredClone(shownOf(shown, shape, this.references)) as Resolved<z.infer<TPublic>, TReferences>
  }

  get isDeleted(): boolean {
    return this.deletion !== 'none'
  }

  protected markAsDeleted(): void {
    if (!this.initial) {
      throw new NewEntityNotDeletable()
    }
    if (this.deletion !== 'none') {
      throw new EntityAlreadyDeleted()
    }
    this.deletion = 'pending'
  }

  protected trackEvent(event: DomainEvent): void {
    this.domainEvents = [...this.domainEvents.filter(each => each.name !== event.name), event]
  }

  get [forRepository](): RepositoryAccess<z.infer<TSchema>> {
    return {
      markPersisted: () => {
        this._version++
        this._isNew = false
        this.initial = structuredClone(this.current)
        this.changed = false
        if (this.deletion === 'pending') {
          this.deletion = 'saved'
        }
      },
      assertSavable: () => {
        if (this.rolledBack) {
          throw new SaveRolledBack(this.constructor.name, this.id)
        }
        if (this.hasPendingChanges || this.changed || this.domainEvents.length === 0) {
          return
        }
        throw new EventWithoutChange(this.constructor.name, this.id, this.domainEvents.map(event => event.name))
      },
      savedState: () => ({ version: this._version, isNew: this._isNew, initial: this.initial, deletion: this.deletion }),
      restoreSaved: (state: SavedState) => {
        this._version = state.version
        this._isNew = state.isNew
        this.initial = state.initial as Fields | null
        this.deletion = state.deletion
        this.rolledBack = true
      },
      storedFields: () => structuredClone(this.current) as z.infer<TSchema>,
      takeEvents: () => {
        const events = this.domainEvents
        this.domainEvents = []
        if (!this.hasPendingChanges) {
          this.changed = false
        }
        return events
      },
    }
  }
}
