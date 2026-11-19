import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { spyOn }               from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { now }                 from '../../clock/now/now'
import { ConcurrencyConflict } from '../../errors/concurrency-conflict/concurrency-conflict'
import { DuplicateValue }      from '../../errors/duplicate-value/duplicate-value'
import { StaleVersion }        from '../../errors/stale-version/stale-version'
import type { Observability }  from '../../observability/observability'
import { AlreadyReceived }     from '../already-received/already-received'
import type { Inbox }          from '../inbox'
import type { ReactionRun }    from '../reaction-run'
import { reactionScope }       from '../reaction-scope/reaction-scope'
import { useCaseChainScope }   from '../use-case-chain-scope/use-case-chain-scope'
import { workerScope }         from '../worker-scope/worker-scope'
import { UseCaseRunner }       from './use-case-runner'

class Recorder implements Observability {
  readonly log: string[] = []
  readonly warnings: { message: string, fields: Record<string, unknown> }[] = []

  async useCase<T>(call: { name: string, module: string, context: string }, run: (attempt: { retrying(error: unknown, attempt: number): void }) => Promise<T>): Promise<T> {
    this.log.push(`${call.name} start ${call.module} ${call.context}`)
    try {
      return await run({ retrying: (_, attempt) => void this.log.push(`${call.name} retrying ${attempt}`) })
    } catch (error) {
      this.log.push(`${call.name} error`)
      throw error
    } finally {
      this.log.push(`${call.name} end`)
    }
  }

  warn(message: string, fields: Record<string, unknown>): void {
    this.warnings.push({ message, fields })
  }
}

describe('observing', () => {
  test('each call is observed with its use case, module and context, the ones it calls inside it', async () => {
    const recorder = new Recorder()
    const runner = new UseCaseRunner({ context: 'shop', observability: recorder })

    await runner.run('order.place', () => runner.run('stock.reserve', async () => {}))

    expect(recorder.log).toEqual(['order.place start order shop', 'stock.reserve start stock shop', 'stock.reserve end', 'order.place end'])
  })

  test('lets the error of the use case through', async () => {
    const recorder = new Recorder()

    await expect(new UseCaseRunner({ observability: recorder }).run('thing.break', async () => {
      throw new Error('boom')
    })).rejects.toThrow('boom')
    expect(recorder.log).toEqual(['thing.break start thing ', 'thing.break error', 'thing.break end'])
  })

  test('each retry on a conflict is told, with the attempt it is', async () => {
    const recorder = new Recorder()
    let conflicts = 2

    await new UseCaseRunner({ observability: recorder, conflictRetries: { backoffMs: 0 } }).run('thing.save', async () => {
      if (conflicts-- > 0) {
        throw new StaleVersion()
      }
    })

    expect(recorder.log).toEqual(['thing.save start thing ', 'thing.save retrying 1', 'thing.save retrying 2', 'thing.save end'])
  })
})

describe('its retries on a conflict', () => {
  async function runs(runner: UseCaseRunner, error: () => Error) {
    let count = 0
    await runner.run('thing.save', async () => {
      count++
      throw error()
    }).catch(() => {})
    return count
  }

  test('are three more by default, one of them after a value taken', async () => {
    expect(await runs(new UseCaseRunner({ conflictRetries: { backoffMs: 0 } }), () => new StaleVersion())).toBe(4)
    expect(await runs(new UseCaseRunner({ conflictRetries: { backoffMs: 0 } }), () => new DuplicateValue(['name']))).toBe(2)
  })

  test('are as many as its options say, and none when they say 0', async () => {
    expect(await runs(new UseCaseRunner({ conflictRetries: { times: 6, backoffMs: 0 } }), () => new StaleVersion())).toBe(7)
    expect(await runs(new UseCaseRunner({ conflictRetries: { times: 0 } }), () => new StaleVersion())).toBe(1)
    expect(await runs(new UseCaseRunner({ conflictRetries: { duplicates: 0 } }), () => new DuplicateValue(['name']))).toBe(1)
    expect(await runs(new UseCaseRunner({ conflictRetries: { duplicates: 3, backoffMs: 0 } }), () => new DuplicateValue(['name']))).toBe(4)
  })

  test('never retry any other error', async () => {
    expect(await runs(new UseCaseRunner(), () => new Error('boom'))).toBe(1)
  })

  test('wait their backoff times the run they are, at most', async () => {
    const runner = new UseCaseRunner({ conflictRetries: { times: 2, backoffMs: 40 } })
    const random = spyOn(Math, 'random').mockReturnValue(1)
    try {
      const started = performance.now()
      await runs(runner, () => new StaleVersion())
      const waited = performance.now() - started
      expect(waited).toBeGreaterThanOrEqual(115)
      expect(waited).toBeLessThan(120 + 50)
    } finally {
      random.mockRestore()
    }
  })

  test('that are refused are refused as it is made', () => {
    expect(() => new UseCaseRunner({ conflictRetries: { times: -1 } })).toThrow('conflictRetries.times is a whole number from 0, not -1')
  })
})

describe('the clock', () => {
  test('is the context one in its use cases', async () => {
    const clock = { now: () => new Date('2026-01-01T00:00:00.000Z') }

    expect(await new UseCaseRunner({ clock }).run('thing.read', async () => now().toISOString())).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('the use case chain', () => {
  test('keeps the use case the work started with, and the one running now', async () => {
    const runner = new UseCaseRunner({ context: 'shop' })

    const seen = await runner.run('order.place', () =>
      runner.run('stock.reserve', async () => useCaseChainScope.get()))

    expect(seen).toEqual({
      root: { context: 'shop', module: 'order', useCase: 'order.place' },
      current: { context: 'shop', module: 'stock', useCase: 'stock.reserve' },
      retry: { allowed: true },
    })
  })
})

describe('on a conflict', () => {
  test('only the first use case of a chain runs again, with all it calls', async () => {
    const runner = new UseCaseRunner({ context: 'shop', conflictRetries: { backoffMs: 0 } })
    let inner = 0

    await runner.run('order.place', () => runner.run('stock.reserve', async () => {
      inner++
      throw new StaleVersion()
    })).catch(() => {})

    expect(inner).toBe(4)
  })

  test('one that must not run twice keeps the ones above it from running it again', async () => {
    const shop = new UseCaseRunner({ context: 'shop' })
    const billing = new UseCaseRunner({ context: 'billing' })
    let invoices = 0
    let orders = 0

    const place = () => shop.run('order.place', async () => {
      await billing.run('invoice.create', async () => {
        invoices++
      }, { retryOnConflict: false })
      if (orders++ === 0) {
        throw new StaleVersion()
      }
    })
    await expect(billing.run('checkout.run', place)).rejects.toBeInstanceOf(ConcurrencyConflict)

    expect([invoices, orders]).toEqual([1, 1])
  })

  test('a chain that has not reached it yet still runs again', async () => {
    const runner = new UseCaseRunner({ context: 'shop', conflictRetries: { backoffMs: 0 } })
    let runs = 0

    await runner.run('order.place', async () => {
      if (runs++ === 0) {
        throw new StaleVersion()
      }
      await runner.run('invoice.create', async () => {}, { retryOnConflict: false })
    })

    expect(runs).toBe(2)
  })
})

describe('checkWriteRule', () => {
  const writeFrom = (runner: UseCaseRunner, root: string, current: string, options?: { other?: UseCaseRunner }) =>
    runner.run(root, () => (options?.other ?? runner).run(current, async () => (options?.other ?? runner).checkWriteRule()))

  test('a use case writes to its own module', async () => {
    await writeFrom(new UseCaseRunner({ context: 'shop' }), 'order.place', 'order.save')
  })

  test('to another one, it is an error by default', async () => {
    await expect(writeFrom(new UseCaseRunner({ context: 'shop' }), 'order.place', 'stock.reserve')).rejects.toThrow('[write rule] order.place writes to shop.stock outside a worker')
  })

  test('from a worker, it may write anywhere', async () => {
    await workerScope.run(true, () => writeFrom(new UseCaseRunner({ context: 'shop' }), 'order.place', 'stock.reserve'))
  })

  test("a use case of another context is that context's API: the root of what it does there", async () => {
    const shop = new UseCaseRunner({ context: 'shop' })
    const billing = new UseCaseRunner({ context: 'billing' })

    await writeFrom(shop, 'order.place', 'invoice.create', { other: billing })
    const chain = await shop.run('order.place', () => billing.run('invoice.create', async () => useCaseChainScope.get()))

    expect(chain?.root).toEqual({ context: 'billing', module: 'invoice', useCase: 'invoice.create' })
  })

  test('inside the context called, the rule holds as for any other', async () => {
    const shop = new UseCaseRunner({ context: 'shop' })
    const billing = new UseCaseRunner({ context: 'billing' })

    await expect(shop.run('order.place', () => billing.run('invoice.create', () => billing.run('payment.take', async () => billing.checkWriteRule()))))
      .rejects.toThrow('invoice.create writes to billing.payment outside a worker')
  })

  test('off checks nothing, and outside a use case there is nothing to check', async () => {
    const recorder = new Recorder()
    await writeFrom(new UseCaseRunner({ writeRule: 'off', observability: recorder }), 'order.place', 'stock.reserve')

    expect(recorder.warnings).toEqual([])
    new UseCaseRunner().checkWriteRule()
  })

  test('warn warns, once for each use case and module it writes to, with them as its fields', async () => {
    const recorder = new Recorder()
    const runner = new UseCaseRunner({ context: 'shop', writeRule: 'warn', observability: recorder })

    await writeFrom(runner, 'order.place', 'stock.reserve')
    await writeFrom(runner, 'order.place', 'stock.reserve')
    await writeFrom(runner, 'order.place', 'invoice.create')

    expect(recorder.warnings.map(each => each.message)).toEqual([
      expect.stringMatching(/^\[write rule\] order\.place writes to shop\.stock/),
      expect.stringMatching(/^\[write rule\] order\.place writes to shop\.invoice/),
    ])
    expect(recorder.warnings[0]?.fields).toEqual({ useCase: 'order.place', module: 'shop.stock' })
  })
})

describe('checkOneModulePerTransaction', () => {
  const saveIn = (runner: UseCaseRunner, saved: Set<string>, root: string, current: string[]) =>
    runner.run(root, async () => {
      for (const each of current) {
        await runner.run(each, async () => runner.checkOneModulePerTransaction(saved))
      }
    })

  test('a transaction saves one module, as many times as it likes, and keeps which', async () => {
    const saved = new Set<string>()

    await saveIn(new UseCaseRunner({ context: 'shop' }), saved, 'order.place', ['order.save', 'order.save'])
    expect([...saved]).toEqual(['shop.order'])
  })

  test('a second module in it is an error, in a worker too', async () => {
    await expect(workerScope.run(true, () => saveIn(new UseCaseRunner({ context: 'shop' }), new Set(), 'order.place', ['order.save', 'stock.reserve'])))
      .rejects.toThrow('[write rule] order.place saves shop.stock in the transaction that saved shop.order')
  })

  test('off, or outside a use case, checks nothing', async () => {
    await saveIn(new UseCaseRunner({ context: 'shop', writeRule: 'off' }), new Set(), 'order.place', ['order.save', 'stock.reserve'])
    new UseCaseRunner({ context: 'shop' }).checkOneModulePerTransaction(new Set(['shop.order']))
  })
})

describe('checkGuardRule', () => {
  test('a save that guards nothing and reads other rows is an error by default', async () => {
    const runner = new UseCaseRunner()

    await expect(runner.run('seat.book', async () => runner.checkGuardRule(['seats']))).rejects.toThrow('[guard rule] seat.book reads seats in a save that guards nothing')
  })

  test('warn warns once, off checks nothing', async () => {
    const recorder = new Recorder()
    const warning = new UseCaseRunner({ guardRule: 'warn', observability: recorder })
    warning.checkGuardRule(['seats'])
    warning.checkGuardRule(['seats'])
    new UseCaseRunner({ guardRule: 'off', observability: recorder }).checkGuardRule(['seats'])

    expect(recorder.warnings).toEqual([{ message: expect.stringMatching(/^\[guard rule\] a save outside any use case reads seats/), fields: { useCase: 'a save outside any use case', tables: ['seats'] } }])
  })
})

class KeptInbox implements Inbox {
  readonly kept = new Set<string>()
  readonly asked: string[] = []

  async has(reaction: ReactionRun): Promise<boolean> {
    this.asked.push(`${reaction.event} ${reaction.queue}`)
    return this.kept.has(`${reaction.event} ${reaction.queue}`)
  }

  async receive(reaction: ReactionRun): Promise<boolean> {
    reaction.received = true
    const key = `${reaction.event} ${reaction.queue}`
    const fresh = !this.kept.has(key)
    this.kept.add(key)
    return fresh
  }

  async purge(): Promise<void> {}
}

describe('the inbox', () => {
  const reaction = (): ReactionRun => ({ event: 'e1', queue: 'invoice.invoice_on_order.placed', received: false })

  test('a use case run as a reaction already received does not run: it says so', async () => {
    const inbox = new KeptInbox()
    inbox.kept.add('e1 invoice.invoice_on_order.placed')
    const runner = new UseCaseRunner({ context: 'billing', inbox })
    let ran = false

    const running = reactionScope.run(reaction(), () => runner.run('billing.invoice', async () => {
      ran = true
    }))

    await expect(running).rejects.toBeInstanceOf(AlreadyReceived)
    expect(ran).toBe(false)
  })

  test('one not received yet runs, and the use cases it calls ask no more', async () => {
    const inbox = new KeptInbox()
    const runner = new UseCaseRunner({ context: 'billing', inbox })

    const value = await reactionScope.run(reaction(), () => runner.run('billing.invoice', () => runner.run('tax.add', async () => 'done')))

    expect(value).toBe('done')
    expect(inbox.asked).toEqual(['e1 invoice.invoice_on_order.placed'])
  })

  test('receive puts the reaction in the inbox once a run, and refuses one received by another run', async () => {
    const inbox = new KeptInbox()
    const runner = new UseCaseRunner({ inbox })
    const first = reaction()

    await reactionScope.run(first, async () => {
      await runner.receive()
      await runner.receive()
    })

    expect(first.received).toBe(true)
    expect(inbox.kept.size).toBe(1)
    await expect(reactionScope.run(reaction(), () => runner.receive())).rejects.toBeInstanceOf(AlreadyReceived)
  })

  test('outside a reaction, or with no inbox, there is nothing to receive nor to ask', async () => {
    const inbox = new KeptInbox()

    await new UseCaseRunner({ inbox }).run('billing.invoice', async () => {})
    await new UseCaseRunner({ inbox }).receive()
    await reactionScope.run(reaction(), () => new UseCaseRunner().run('billing.invoice', () => new UseCaseRunner().receive()))

    expect(inbox.asked).toEqual([])
    expect(inbox.kept.size).toBe(0)
  })
})
