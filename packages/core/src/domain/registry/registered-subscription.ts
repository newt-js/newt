export type RegisteredSubscription = {
  event: string
  strategy: 'handler' | 'fire-and-forget'
  queue: string | null
  attempts: number | null
  filtered: boolean | null
}
