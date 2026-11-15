export type QueueDepth = {
  queue: string
  ready: number
  retrying: number
  running: number
  dead: number
  oldestDueAt: string | null
}
