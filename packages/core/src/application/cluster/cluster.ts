export interface Cluster {
  count(key: string): Promise<number>
  increment(key: string, by: number, ttlMs: number): Promise<number>
  forget(key: string): Promise<void>
  publish(channel: string): Promise<void>
  subscribe(channel: string, listener: () => void): () => void
}
