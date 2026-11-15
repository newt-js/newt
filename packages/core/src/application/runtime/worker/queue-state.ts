export type QueueState = {
  queue: string
  ready: number
  retrying: number
  running: number
  dead: number
  oldestDueAt: string | null
  lastSeenAt: string | null
  orphan: boolean
}
