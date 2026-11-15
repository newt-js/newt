export type SqlRow = Record<string, unknown>

export type SqlRun = (sql: string, params?: unknown[]) => Promise<SqlRow[]>
