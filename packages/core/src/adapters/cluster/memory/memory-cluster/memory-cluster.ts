import { Cluster } from '../../../../application/cluster/cluster'
import { log }     from '../../../../application/platform/log/log'

type Counter = { value: number, expiresAt: number }

const SWEEP_EVERY_MS = 1000

export class MemoryCluster implements Cluster {

  private readonly counters = new Map<string, Counter>()
  private readonly listeners = new Map<string, Set<() => void>>()
  private nextSweepAt = 0

  async count(key: string): Promise<number> {
    return this.alive(key)?.value ?? 0
  }

  async increment(key: string, by: number, ttlMs: number): Promise<number> {
    this.sweep()
    const value = (this.alive(key)?.value ?? 0) + by
    this.counters.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  async forget(key: string): Promise<void> {
    this.counters.delete(key)
  }

  async publish(channel: string): Promise<void> {
    for (const listener of [...this.listeners.get(channel) ?? []]) {
      try {
        listener()
      } catch (error) {
        log.error(`[MemoryCluster] a listener of ${channel} failed`, { channel, error })
      }
    }
  }

  subscribe(channel: string, listener: () => void): () => void {
    const each = () => listener()
    const listeners = this.listeners.get(channel) ?? new Set()
    listeners.add(each)
    this.listeners.set(channel, listeners)
    return () => {
      listeners.delete(each)
    }
  }

  private alive(key: string): Counter | undefined {
    const counter = this.counters.get(key)
    if (counter && counter.expiresAt <= Date.now()) {
      this.counters.delete(key)
      return undefined
    }
    return counter
  }

  private sweep(): void {
    const now = Date.now()
    if (now < this.nextSweepAt) {
      return
    }
    this.nextSweepAt = now + SWEEP_EVERY_MS
    for (const [key, counter] of this.counters) {
      if (counter.expiresAt <= now) {
        this.counters.delete(key)
      }
    }
  }
}
