import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }  from '../../../../adapters/database/memory/memory-database/memory-database'
import type { Clock }      from '../../../../domain/clock/clock'
import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'
import { Module }          from '../../../../domain/module/module/module'
import { UseCase }         from '../../../../domain/use-case/use-case/use-case'
import { MemoryCluster }   from '../../../cluster/memory-cluster/memory-cluster'
import { ContextBase }     from '../../../context/context-base/context-base'
import { Platform }        from '../../../platform/platform/platform'

const MINUTE = 60_000

async function base(name = 'auth', platform = new Platform({ cluster: new MemoryCluster() })) {
  let time = Date.parse('2026-01-01T10:00:00.000Z')
  const clock: Clock = { now: () => new Date(time) }
  return { base: new ContextBase({ name, database: new MemoryDatabase(), clock, platform }), later: (ms: number) => {
    time += ms
  } }
}

class Session_Module extends Module {
  readonly signIns

  constructor(base: ContextBase) {
    super('session', base.useCaseRunner, {})
    this.signIns = base.rateLimits.define('session.signIn', { limit: 2, windowMs: MINUTE })
  }

  @UseCase()
  async signIn(email: string, right: boolean): Promise<string> {
    await this.signIns.take(email)
    if (!right) {
      return 'wrong'
    }
    await this.signIns.forget(email)
    return 'in'
  }
}

describe('rate limits', () => {
  test('count in the platform\'s cluster, which every instance on it shares', async () => {
    const platform = new Platform({ cluster: new MemoryCluster() })
    const one = new Session_Module(new ContextBase({ name: 'auth', database: new MemoryDatabase(), platform }))
    const other = new Session_Module(new ContextBase({ name: 'auth', database: new MemoryDatabase(), platform }))
    await one.signIn('ana@example.com', false)
    await other.signIn('ana@example.com', false)

    await expect(one.signIn('ana@example.com', false)).rejects.toBeInstanceOf(TooManyRequests)
  })

  test('a use case past its limit is TooManyRequests, naming the limit and how long to wait', async () => {
    const { base: auth } = await base()
    const sessions = new Session_Module(auth)
    await sessions.signIn('ana@example.com', false)
    await sessions.signIn('ana@example.com', false)

    const refused = await sessions.signIn('ana@example.com', false).catch(error => error)
    expect(refused).toBeInstanceOf(TooManyRequests)
    expect(refused).toMatchObject({ kind: 'too_many_requests', code: 'too_many_requests', params: { limit: 'session.signIn' } })
    expect(refused.params.retryAfterSeconds).toBeGreaterThan(0)
    expect(await sessions.signIn('bea@example.com', true)).toBe('in')
    await auth.close()
  })

  test('counts by the context\'s clock: once it waits long enough, it may again', async () => {
    const { base: auth, later } = await base()
    const sessions = new Session_Module(auth)
    await sessions.signIn('ana@example.com', false)
    await sessions.signIn('ana@example.com', false)
    const refused = await sessions.signIn('ana@example.com', false).catch((error: unknown) => error) as TooManyRequests

    later(refused.params.retryAfterSeconds * 1000)
    expect(await sessions.signIn('ana@example.com', true)).toBe('in')
    await auth.close()
  })

  test('forgetting a key starts it afresh', async () => {
    const { base: auth } = await base()
    const sessions = new Session_Module(auth)
    await sessions.signIn('ana@example.com', false)
    await sessions.signIn('ana@example.com', true)

    await sessions.signIn('ana@example.com', false)
    expect(await sessions.signIn('ana@example.com', false)).toBe('wrong')
    await auth.close()
  })

  test('two contexts on one platform keep their counts apart', async () => {
    const shared = new Platform({ cluster: new MemoryCluster() })
    const one = await base('auth', shared)
    const two = await base('boards', shared)
    const limit = { limit: 1, windowMs: MINUTE }
    await one.base.rateLimits.define('session.signIn', limit).take('ana')

    expect((await two.base.rateLimits.define('session.signIn', limit).take('ana')).allowed).toBe(true)
  })

  test('a limit is named <module>.<name>, once, with a rule that can count', async () => {
    const { base: auth } = await base()

    expect(() => auth.rateLimits.define('signIn', { limit: 1, windowMs: MINUTE })).toThrow('<module>.<name>')
    expect(() => auth.rateLimits.define('auth[session].signIn', { limit: 1, windowMs: MINUTE })).toThrow('A rate limit is named <module>.<name>, as session.signIn: auth[session].signIn')
    expect(() => auth.rateLimits.define('Session.signIn', { limit: 1, windowMs: MINUTE })).toThrow('<module>.<name>')
    expect(() => auth.rateLimits.define('session.signIn', { limit: 1, windowMs: MINUTE })).not.toThrow()
    expect(() => auth.rateLimits.define('session.signIn', { limit: 1, windowMs: MINUTE })).toThrow('twice')
    expect(() => auth.rateLimits.define('session.other', { limit: 0, windowMs: MINUTE })).toThrow('limit')
    await auth.close()
  })
})
