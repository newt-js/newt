export type SqliteDatabaseOptions = {
  path: string
  migrations?: string | undefined
  waitTimeoutMs?: number | undefined
}
