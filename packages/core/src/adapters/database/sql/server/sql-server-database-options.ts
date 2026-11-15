export type SqlServerDatabaseOptions = {
  url: string
  migrations?: string | undefined
  connections?: number | undefined
  waitTimeoutMs?: number | undefined
}
