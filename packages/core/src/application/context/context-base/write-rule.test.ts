import { beforeEach }       from 'bun:test'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { z }                from 'zod'
// --------------------------------------------------------
import { MemoryDatabase }   from '../../../adapters/database/memory/memory-database/memory-database'
import type { EntityInput } from '../../../domain/entity/entity-input'
import { Entity }           from '../../../domain/entity/entity/entity'
import type { DomainEvent } from '../../../domain/events/event/domain-event'
import { eventsOf }         from '../../../domain/events/events-of/events-of'
import { Module }           from '../../../domain/module/module/module'
import { Repository }       from '../../../domain/repository/repository/repository'
import { UseCase }          from '../../../domain/use-case/use-case/use-case'
import type { WriteRule }   from '../../../domain/use-case/write-rule'
import { uuidV7 }           from '../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { MemoryCluster }    from '../../cluster/memory-cluster/memory-cluster'
import { captureLines }     from '../../platform/capture-lines/capture-lines'
import { Platform }         from '../../platform/platform/platform'
import { ContextBase }      from './context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

const NoteSchema = z.object({ id: z.string(), text: z.string(), createdAt: z.string().default(''), updatedAt: z.string().default('') })
type NoteRow = z.infer<typeof NoteSchema> & { version: number }

class Note extends Entity<typeof NoteSchema> {
  static write(text: string) {
    return new Note(NoteSchema, { text } as EntityInput<z.infer<typeof NoteSchema>>, true)
  }
  static fromRow(row: NoteRow) {
    return new Note(NoteSchema, row, false)
  }
}

class Notes extends Repository<Note, NoteRow> {
  protected toEntity(row: NoteRow) {
    return Note.fromRow(row)
  }

  async stamp(text: string) {
    await this.saveRows(() => this.records.insert({ id: uuidV7(), text, createdAt: '', updatedAt: '' }))
  }

  async persistAfter(before: () => Promise<void>, note: Note) {
    await this.save([note], entity => this.write(entity), { before })
  }
}

class Written implements DomainEvent<{ text: string }> {
  static readonly eventName = 'diary.written'
  readonly name = Written.eventName
  readonly occurredAt = ''
  constructor(readonly payload: { text: string }) {}
}

class Diary extends Module {
  readonly events
  constructor(base: ContextBase, private readonly log: Log) {
    super('diary', base.useCaseRunner)
    this.events = eventsOf(base.bus, { written: Written })
  }
  @UseCase()
  async writeBoth(text: string) {
    await this.log.add(text)
  }
  @UseCase()
  async stampBoth(text: string) {
    await this.log.stamp(text)
  }
}

class Log extends Module {
  constructor(base: ContextBase, private readonly notes: Notes) {
    super('log', base.useCaseRunner)
  }
  @UseCase()
  async add(text: string) {
    await this.notes.persist(Note.write(text))
  }
  @UseCase()
  async stamp(text: string) {
    await this.notes.stamp(text)
  }
}

let database: MemoryDatabase

beforeEach(() => {
  database = new MemoryDatabase()
})

function open(writeRule: WriteRule) {
  const base = new ContextBase({ name: 'test', platform, database, writeRule })
  const log = new Log(base, new Notes(base, database.records<NoteRow>('note'), { scope: 'none' }))
  return { base, log, diary: new Diary(base, log) }
}

describe('the write rule', () => {
  test('lets a use case write to its own module', async () => {
    const { log } = open('error')

    await log.add('mine')
    expect(await database.records('note').count()).toBe(1)
  })

  test('refuses a use case writing to another module outside a worker', async () => {
    const { diary } = open('error')

    await expect(diary.writeBoth('theirs')).rejects.toThrow('diary.writeBoth writes to test.log outside a worker')
    expect(await database.records('note').count()).toBe(0)
  })

  test("lets a use case call another context's, as an outside API", async () => {
    const shop = new ContextBase({ name: 'shop', platform, database, writeRule: 'error' })
    const other = new ContextBase({ name: 'other', platform, database, writeRule: 'error' })
    const log = new Log(other, new Notes(other, database.records<NoteRow>('note'), { scope: 'none' }))
    const diary = new Diary(shop, log)

    await diary.writeBoth('theirs')
    expect(await database.records('note').count()).toBe(1)
  })

  test('still holds inside the context that was called', async () => {
    const shop = new ContextBase({ name: 'shop', platform, database, writeRule: 'error' })
    const other = new ContextBase({ name: 'other', platform, database, writeRule: 'error' })
    const otherDiary = new Diary(other, new Log(other, new Notes(other, database.records<NoteRow>('note'), { scope: 'none' })))
    class Caller extends Module {
      constructor() {
        super('caller', shop.useCaseRunner)
      }
      @UseCase()
      async callTheirs() {
        await otherDiary.writeBoth('theirs')
      }
    }

    await expect(new Caller().callTheirs()).rejects.toThrow('diary.writeBoth writes to other.log outside a worker')
  })

  test('is an error by default', async () => {
    const base = new ContextBase({ name: 'test', platform, database })
    const diary = new Diary(base, new Log(base, new Notes(base, database.records<NoteRow>('note'), { scope: 'none' })))

    await expect(diary.writeBoth('theirs')).rejects.toThrow('outside a worker')
  })

  test('covers rows written with saveRows too', async () => {
    const { diary, log } = open('error')

    await log.stamp('mine')
    await expect(diary.stampBoth('theirs')).rejects.toThrow('diary.stampBoth writes to test.log outside a worker')
    expect(await database.records('note').count()).toBe(1)
  })

  test('lets a worker write to any module', async () => {
    const { base, log, diary } = open('error')
    diary.events.written.subscribe(written => log.add(written.text), { strategy: 'handler', queue: 'log.add_on_diary.written' })
    base.worker.start()

    await database.run(() => base.bus.publish(new Written({ text: 'later' })))
    await base.worker.idle()
    await base.worker.stop()

    expect(await database.records('note').count()).toBe(1)
  })

  test('warn only warns, once for each use case and module', async () => {
    const { diary } = open('warn')
    const log = captureLines(platform)
    const warnings = log.said('warn')
    try {
      await diary.writeBoth('one')
      await diary.writeBoth('two')
    } finally {
      log.restore()
    }

    expect(warnings).toHaveLength(1)
    expect(await database.records('note').count()).toBe(2)
  })
})

class Journal extends Module {
  constructor(base: ContextBase, private readonly notes: Notes, private readonly log: Log) {
    super('journal', base.useCaseRunner)
  }
  @UseCase()
  async writeThenLog(text: string) {
    await this.notes.persist(Note.write(text))
    await this.log.add(text)
  }
  @UseCase()
  async logInItsSave(text: string) {
    await this.notes.persistAfter(() => this.log.add(text), Note.write(text))
  }
  @UseCase()
  async logInOneTransaction(text: string) {
    await this.atOnce(text)
  }
  private atOnce(text: string) {
    return database.run(async () => {
      await this.notes.persist(Note.write(text))
      await this.log.add(text)
    })
  }
}

describe('the write rule, for one transaction', () => {
  function openJournal(writeRule: WriteRule) {
    const { base, log } = open(writeRule)
    return { base, journal: new Journal(base, new Notes(base, database.records<NoteRow>('note'), { scope: 'none' }), log) }
  }

  test('lets a worker save one module after another, each in its own', async () => {
    const { base, journal } = openJournal('error')

    await base.worker.runAsWorker(() => journal.writeThenLog('both'))
    expect(await database.records('note').count()).toBe(2)
  })

  test("refuses a save hook that saves another module's in its transaction, in a worker too", async () => {
    const { base, journal } = openJournal('error')

    await expect(base.worker.runAsWorker(() => journal.logInItsSave('both')))
      .rejects.toThrow('[write rule] journal.logInItsSave saves test.log in the transaction that saved test.journal')
    expect(await database.records('note').count()).toBe(0)
  })

  test('refuses two modules saved in one database.transaction, in a worker too', async () => {
    const { base, journal } = openJournal('error')

    await expect(base.worker.runAsWorker(() => journal.logInOneTransaction('both'))).rejects.toThrow('saves test.log in the transaction that saved test.journal')
    expect(await database.records('note').count()).toBe(0)
  })

  test('warn only warns, and off checks nothing', async () => {
    const log = captureLines(platform)
    const warnings = log.said('warn')
    try {
      const warned = openJournal('warn')
      await warned.base.worker.runAsWorker(() => warned.journal.logInItsSave('one'))
      const off = openJournal('off')
      await off.base.worker.runAsWorker(() => off.journal.logInItsSave('two'))
    } finally {
      log.restore()
    }

    expect(warnings).toEqual([expect.stringContaining('journal.logInItsSave saves test.log')])
    expect(await database.records('note').count()).toBe(4)
  })
})
