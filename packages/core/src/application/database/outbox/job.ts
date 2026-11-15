export type Job = {
  id: string
  queue: string
  event: string
  status: 'pending' | 'running' | 'done' | 'dead'
  attempts: number
  runAfter: string
  lockedBy: string | null
  lockedUntil: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}
