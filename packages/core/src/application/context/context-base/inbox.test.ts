import { afterEach }      from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { z }              from 'zod'
// --------------------------------------------------------
import { MemoryCluster }  from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { EntityInput }    from '../../../domain/entity/entity-input'
import { Entity }         from '../../../domain/entity/entity/entity'
import { defineEvent }    from '../../../domain/events/define-event/define-event'
import { eventsOf }       from '../../../domain/events/events-of/events-of'
import { Module }         from '../../../domain/module/module/module'
import { Repository }     from '../../../domain/repository/repository/repository'
import { UseCase }        from '../../../domain/use-case/use-case/use-case'
import { CapturedLines }  from '../../platform/capture-lines/capture-lines'
import { captureLines }   from '../../platform/capture-lines/capture-lines'
import { Platform }       from '../../platform/platform/platform'
import { TestClock }      from '../../testing/test-clock/test-clock'
import { ContextBase }    from './context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

const Placed = defineEvent('order.placed', z.object({ order: z.string() }))

const InvoiceSchema = z.object({ id: z.string(), order: z.string(), createdAt: z.string().default(''), updatedAt: z.string().default('') })
type InvoiceRow = z.infer<typeof InvoiceSchema> & { version: number }

class Invoice extends Entity<typeof InvoiceSchema> {
  static issue(order: string) {
    return new Invoice(InvoiceSchema, { order } as EntityInput<z.infer<typeof InvoiceSchema>>, true)
  }
  static fromRow(row: InvoiceRow) {
    return new Invoice(InvoiceSchema, row, false)
  }
}

class Invoices extends Repository<Invoice, InvoiceRow> {
  protected toEntity(row: InvoiceRow) {
    return Invoice.fromRow(row)
  }
}

class Orders extends Module {
  readonly events
  constructor(base: ContextBase) {
    super('order', base.useCaseRunner)
    this.events = eventsOf(base.bus, { placed: Placed })
  }
}

class Billing extends Module {
  failures = 0
  constructor(base: ContextBase, private readonly invoices: Invoices) {
    super('billing', base.useCaseRunner)
  }
  @UseCase()
  async invoice(order: string) {
    await this.invoices.persist(Invoice.issue(order), {
      before: () => {
        if (this.failures-- > 0) {
          throw new Error('the save failed')
        }
      },
    })
  }
}

const LEASE_MS = 1_000

let captured: CapturedLines | null = null

afterEach(() => {
  captured?.restore()
  captured = null
})

function open() {
  const clock = new TestClock()
  const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase(), clock, worker: { leaseMs: LEASE_MS, backoffMs: 1 } })
  const billingDatabase = new MemoryDatabase()
  const billingContext = new ContextBase({ name: 'billing', platform, database: billingDatabase, clock })
  const orders = new Orders(shop)
  const billing = new Billing(billingContext, new Invoices(billingContext, billingDatabase.records<InvoiceRow>('invoice'), { scope: 'none' }))
  billing.on(orders.events.placed, 'invoice', placed => [placed.order])
  const place = (order: string) => shop.database.run(() => shop.bus.publish(new Placed({ order })))
  const invoices = () => billingDatabase.records<InvoiceRow>('invoice').find()
  const inbox = () => billingDatabase.records('newt_inbox').count()
  const jobs = () => shop.database.outbox.list()
  return { clock, shop, billing, place, invoices, inbox, jobs }
}

describe('a reaction to an event of another context', () => {
  test('whose job runs again after its use case committed, as when the worker died before closing it, writes nothing twice', async () => {
    const { clock, shop, place, invoices, inbox, jobs } = open()
    const close = shop.database.outbox.close.bind(shop.database.outbox)
    let dead = true
    shop.database.outbox.close = async (claimed, closing, now) => {
      if (dead) {
        throw new Error('the process died before closing the job')
      }
      return close(claimed, closing, now)
    }
    captured = captureLines(platform)

    await place('o1')
    await shop.worker.idle()
    expect(await invoices()).toHaveLength(1)
    expect(await jobs()).toEqual([expect.objectContaining({ status: 'running', attempts: 1 })])

    dead = false
    clock.advance(LEASE_MS + 1)
    await shop.worker.idle()

    expect((await invoices()).map(invoice => invoice.order)).toEqual(['o1'])
    expect(await inbox()).toBe(1)
    expect(await jobs()).toEqual([expect.objectContaining({ status: 'done', attempts: 2 })])
  })

  test('whose save rolled back is not received: it runs again, and writes then', async () => {
    const { clock, billing, shop, place, invoices, inbox, jobs } = open()
    billing.failures = 1
    captured = captureLines(platform)

    await place('o1')
    await shop.worker.idle()
    expect(await invoices()).toEqual([])
    expect(await inbox()).toBe(0)

    clock.advance(LEASE_MS)
    await shop.worker.idle()

    expect((await invoices()).map(invoice => invoice.order)).toEqual(['o1'])
    expect(await inbox()).toBe(1)
    expect(await jobs()).toEqual([expect.objectContaining({ status: 'done', attempts: 2 })])
  })

  test('each event gets its reaction, and a use case called outside a worker puts nothing in the inbox', async () => {
    const { billing, shop, place, invoices, inbox } = open()

    await place('o1')
    await place('o2')
    await shop.worker.idle()
    await billing.invoice('o3')

    expect((await invoices()).map(invoice => invoice.order).sort()).toEqual(['o1', 'o2', 'o3'])
    expect(await inbox()).toBe(2)
  })
})
