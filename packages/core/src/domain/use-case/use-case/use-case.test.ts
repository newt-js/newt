import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict } from '../../errors/concurrency-conflict/concurrency-conflict'
import { DuplicateValue }      from '../../errors/duplicate-value/duplicate-value'
import { StaleVersion }        from '../../errors/stale-version/stale-version'
import { UseCaseRunner }       from '../use-case-runner/use-case-runner'
import { UseCase }             from './use-case'

class Module {
  constructor(readonly name: string, readonly useCaseRunner: UseCaseRunner) {}
}

class Counter extends Module {
  runs = 0

  constructor(private conflicts: number) {
    super('counter', new UseCaseRunner({ context: 'shop', conflictRetries: { backoffMs: 0 } }))
  }

  @UseCase()
  async increase() {
    this.runs++
    if (this.conflicts-- > 0) {
      throw new StaleVersion()
    }
  }

  @UseCase({ retryOnConflict: false })
  async set() {
    this.runs++
    if (this.conflicts-- > 0) {
      throw new StaleVersion()
    }
  }

  @UseCase()
  async take() {
    this.runs++
    throw this.conflicts-- > 0 ? new StaleVersion() : new DuplicateValue(['name'])
  }

  @UseCase()
  async fail() {
    this.runs++
    throw new Error('boom')
  }
}

describe('@UseCase', () => {
  test('runs the method as a use case named after its module and itself, with its arguments', async () => {
    class Greeter {
      readonly name = 'greeter'
      readonly useCaseRunner = new UseCaseRunner()

      @UseCase()
      async greet(who: string, times: number) {
        return `${who} ${times}`
      }
    }

    expect(await new Greeter().greet('Ana', 2)).toBe('Ana 2')
  })

  test('registers each use case of the instance, with its options, once its base class gave it its runner', () => {
    const counter = new Counter(0)

    expect(counter.useCaseRunner.registry.isUseCase('counter.increase')).toBe(true)
    expect(counter.useCaseRunner.registry.registeredModules[0]?.useCases.get('set')).toEqual({ retryOnConflict: false })
  })
})

describe('@UseCase, by default', () => {
  test('runs again after a conflict', async () => {
    const counter = new Counter(2)
    await counter.increase()

    expect(counter.runs).toBe(3)
  })

  test('gives up after three retries', async () => {
    const counter = new Counter(10)

    await expect(counter.increase()).rejects.toBeInstanceOf(ConcurrencyConflict)
    expect(counter.runs).toBe(4)
  })

  test('runs again only once after a value taken: then its own check answers', async () => {
    const counter = new Counter(0)

    await expect(counter.take()).rejects.toBeInstanceOf(DuplicateValue)
    expect(counter.runs).toBe(2)
  })

  test('a value taken after other conflicts still runs it once more, within the three retries', async () => {
    const counter = new Counter(1)

    await expect(counter.take()).rejects.toBeInstanceOf(DuplicateValue)
    expect(counter.runs).toBe(3)
  })

  test('never retries any other error', async () => {
    const counter = new Counter(0)

    await expect(counter.fail()).rejects.toThrow('boom')
    expect(counter.runs).toBe(1)
  })
})

describe('@UseCase with retryOnConflict: false', () => {
  test('lets the conflict through at once', async () => {
    const counter = new Counter(1)

    await expect(counter.set()).rejects.toBeInstanceOf(ConcurrencyConflict)
    expect(counter.runs).toBe(1)
  })
})
