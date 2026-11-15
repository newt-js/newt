import { RedisClient }  from 'bun'
import { RedisOptions } from 'bun'
// --------------------------------------------------------
import { Cluster }      from '../../../../application/cluster/cluster'
import { log }          from '../../../../application/platform/log/log'
import { pause }        from '../pause/pause'

const INCREMENT = `local value = redis.call('INCRBY', KEYS[1], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return value`
const RECONNECT_FIRST_MS = 50
const RECONNECT_MOST_MS = 2000

type Channel = { listeners: Set<() => void>, hear: () => void, dispatch: () => void, subscribed: Promise<unknown> }

export class ValkeyCluster implements Cluster {

  private readonly client: RedisClient
  private listening: Promise<RedisClient> | null = null
  private readonly channels = new Map<string, Channel>()
  private closing = false

  constructor(url?: string, options?: RedisOptions) {
    this.client = this.heal(new RedisClient(url, options))
  }

  async count(key: string): Promise<number> {
    return Number(await this.client.get(key) ?? 0)
  }

  async increment(key: string, by: number, ttlMs: number): Promise<number> {
    return Number(await this.client.send('EVAL', [INCREMENT, '1', key, String(by), String(Math.max(1, Math.ceil(ttlMs)))]))
  }

  async forget(key: string): Promise<void> {
    await this.client.del(key)
  }

  async publish(channel: string): Promise<void> {
    await this.channels.get(channel)?.subscribed
    await this.client.publish(channel, '')
  }

  subscribe(channel: string, listener: () => void): () => void {
    const each = () => listener()
    const known = this.channels.get(channel) ?? this.listen(channel)
    known.listeners.add(each)
    return () => {
      known.listeners.delete(each)
      if (known.listeners.size === 0 && this.channels.get(channel) === known) {
        this.channels.delete(channel)
        void Promise.all([this.subscriber(), known.subscribed]).then(([subscriber]) => subscriber.unsubscribe(channel, known.dispatch)).catch((error: unknown) => {
          log.error(`[ValkeyCluster] could not unsubscribe from ${channel}`, { channel, error })
        })
      }
    }
  }

  async close(): Promise<void> {
    this.closing = true
    this.channels.clear()
    const listening = this.listening
    this.listening = null
    this.client.close()
    if (listening) {
      (await listening.catch(() => null))?.close()
    }
  }

  private listen(channel: string): Channel {
    const known: Channel = {
      listeners: new Set(),
      hear: () => {
        for (const listener of [...known.listeners]) {
          try {
            listener()
          } catch (error) {
            log.error(`[ValkeyCluster] a listener of ${channel} failed`, { channel, error })
          }
        }
      },
      dispatch: () => known.hear(),
      subscribed: Promise.resolve(),
    }
    known.subscribed = this.subscriber().then(subscriber => subscriber.subscribe(channel, known.dispatch)).catch((error: unknown) => {
      log.error(`[ValkeyCluster] could not subscribe to ${channel}`, { channel, error })
    })
    this.channels.set(channel, known)
    return known
  }

  private heal(client: RedisClient): RedisClient {
    let healing = false
    client.onclose = (error: Error) => {
      if (this.closing || healing) {
        return
      }
      healing = true
      log.warn('[ValkeyCluster] lost its connection, connecting again', { error })
      void (async () => {
        for (let wait = RECONNECT_FIRST_MS; !this.closing && !client.connected; wait = Math.min(wait * 2, RECONNECT_MOST_MS)) {
          await pause(wait)
          if (!this.closing && !client.connected) {
            await client.connect().catch(() => {})
          }
        }
        healing = false
        if (this.closing) {
          client.close()
        }
      })()
    }
    return client
  }

  private resubscribe(subscriber: RedisClient): void {
    for (const [channel, known] of this.channels) {
      known.subscribed = known.subscribed.then(async () => {
        if (this.channels.get(channel) !== known) {
          return
        }
        const before = known.dispatch
        const dispatch = () => known.hear()
        await subscriber.subscribe(channel, dispatch)
        known.dispatch = dispatch
        await subscriber.unsubscribe(channel, before)
      }).catch((error: unknown) => {
        log.error(`[ValkeyCluster] could not subscribe again to ${channel}`, { channel, error })
      })
    }
  }

  private subscriber(): Promise<RedisClient> {
    return this.listening ??= this.client.duplicate().then(subscriber => {
      subscriber.onconnect = () => this.resubscribe(subscriber)
      return this.heal(subscriber)
    })
  }
}
