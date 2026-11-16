import { beforeEach }       from 'bun:test'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { z }                from 'zod'
// --------------------------------------------------------
import { MemoryCluster }    from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase }   from '../../../adapters/database/memory/memory-database/memory-database'
import type { EntityInput } from '../../../domain/entity/entity-input'
import { Entity }           from '../../../domain/entity/entity/entity'
import { Module }           from '../../../domain/module/module/module'
import { Repository }       from '../../../domain/repository/repository/repository'
import type { GuardRule }   from '../../../domain/use-case/guard-rule'
import { UseCase }          from '../../../domain/use-case/use-case/use-case'
import { uuidV7 }           from '../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { captureLines }     from '../../platform/capture-lines/capture-lines'
import { Platform }         from '../../platform/platform/platform'
import { ContextBase }      from './context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

const MAX = 2

const ColumnSchema = z.object({ id: z.string(), boardId: z.string(), name: z.string(), createdAt: z.string().default(''), updatedAt: z.string().default('') })
type ColumnRow = z.infer<typeof ColumnSchema> & { version: number }

class Column extends Entity<typeof ColumnSchema> {
  static add(boardId: string, name: string) {
    return new Column(ColumnSchema, { boardId, name } as EntityInput<z.infer<typeof ColumnSchema>>, true)
  }
  static fromRow(row: ColumnRow) {
    return new Column(ColumnSchema, row, false)
  }
  get boardId() {
    return this.toDTO().boardId
  }
  rename(name: string) {
    this.change({ name })
  }
}

class Columns extends Repository<Column, ColumnRow> {
  protected toEntity(row: ColumnRow) {
    return Column.fromRow(row)
  }

  async persistGuarded(column: Column) {
    await this.save([column], each => this.write(each), {
      guard: [`columns:${column.boardId}`],
      after: async () => {
        if (await this.count({ boardId: column.boardId }) > MAX) {
          throw new Error('too many')
        }
      },
    })
  }

  async persistWithEmptyGuard(column: Column) {
    await this.save([column], each => this.write(each), {
      guard: [],
      after: async () => {
        if (await this.count({ boardId: column.boardId }) > MAX) {
          throw new Error('too many')
        }
      },
    })
  }

  async persistReadingBefore(column: Column) {
    await this.save([column], each => this.write(each), {
      before: async () => {
        if ((await this.find({ boardId: column.boardId })).length >= MAX) {
          throw new Error('too many')
        }
      },
    })
  }

  async copyBoard(from: string, to: string) {
    await this.saveRows(async () => {
      for (const row of await this.records.find({ boardId: from })) {
        await this.records.insert({ ...row, id: uuidV7(), boardId: to })
      }
    })
  }
}

class Board extends Module {
  constructor(base: ContextBase, readonly columns: Columns) {
    super('column', base.useCaseRunner)
  }
  @UseCase()
  async add(boardId: string, name: string) {
    await this.columns.persistWithEmptyGuard(Column.add(boardId, name))
  }
}

let database: MemoryDatabase

beforeEach(() => {
  database = new MemoryDatabase()
})

function open(guardRule?: GuardRule) {
  const base = new ContextBase({ name: 'test', platform, database, guardRule })
  return new Columns(base, database.records<ColumnRow>('column'), { scope: 'none' })
}

const saved = () => database.records('column').count()

describe('the guard rule', () => {
  test('lets a save read what it guards', async () => {
    const columns = open()

    await columns.persistGuarded(Column.add('b1', 'todo'))
    await columns.persistGuarded(Column.add('b1', 'doing'))
    await expect(columns.persistGuarded(Column.add('b1', 'done'))).rejects.toThrow('too many')
    expect(await saved()).toBe(2)
  })

  test('refuses a save that reads with an empty guard, and writes nothing of it', async () => {
    const columns = open()

    await expect(columns.persistWithEmptyGuard(Column.add('b1', 'todo'))).rejects.toThrow('[guard rule] a save outside any use case reads column in a save that guards nothing')
    expect(await saved()).toBe(0)
  })

  test('names the use case whose save it is', async () => {
    const board = new Board(new ContextBase({ name: 'test', platform, database }), open())

    await expect(board.add('b1', 'todo')).rejects.toThrow('[guard rule] column.add reads column')
  })

  test('refuses one that reads in before, and rows written with saveRows from what they read', async () => {
    const columns = open()
    await columns.persistGuarded(Column.add('b1', 'todo'))

    await expect(columns.persistReadingBefore(Column.add('b1', 'doing'))).rejects.toThrow('[guard rule]')
    await expect(columns.copyBoard('b1', 'b2')).rejects.toThrow('[guard rule]')
    expect(await saved()).toBe(1)
  })

  test('says nothing of reads outside the save: an entity read, changed and saved with its version, even in one transaction', async () => {
    const columns = open()
    await columns.persistGuarded(Column.add('b1', 'todo'))

    const read = (await columns.find())[0]!
    read.rename('to do')
    await columns.persist(read)
    await database.run(async () => {
      const again = (await columns.find())[0]!
      again.rename('todo')
      await columns.persist(again)
    })
    expect((await columns.find())[0]!.toDTO().name).toBe('todo')
  })

  test('warn only warns, once for each use case and what it read, and off says nothing', async () => {
    const log = captureLines(platform)
    const warnings = log.said('warn')
    try {
      const warned = open('warn')
      await warned.persistWithEmptyGuard(Column.add('b1', 'todo'))
      await warned.persistWithEmptyGuard(Column.add('b1', 'doing'))
      await open('off').persistWithEmptyGuard(Column.add('b2', 'todo'))
    } finally {
      log.restore()
    }

    expect(warnings).toHaveLength(1)
    expect(await saved()).toBe(3)
  })
})
