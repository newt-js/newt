import type { StoredRow } from './records/stored-row'

export type RepositoryScope<Row extends StoredRow = StoredRow> = { field: Extract<keyof Row, string>, current: () => string }

export type RepositoryOptions<Row extends StoredRow = StoredRow> = {
  softDelete?: boolean | undefined
  scope: RepositoryScope<Row> | 'none'
}
