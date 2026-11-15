export type DeadJob = {
  id: string
  queue: string
  event: string
  attempts: number
  lastError: string | null
  createdAt: string
  diedAt: string
}
