import type { Loads }     from '../module/resolve-reference/resolve-reference'
import type { StoredRow } from './records/stored-row'

export type RepositoryScope<Row extends StoredRow = StoredRow> = { field: Extract<keyof Row, string>, current: () => string }

export type RepositoryOptions<Row extends StoredRow = StoredRow, References = {}> = {
  softDelete?: boolean | undefined
  scope: RepositoryScope<Row> | 'none'
} & ([keyof References] extends [never]
  ? { references?: undefined }
  /** How each entity its entity references loads, through the other module's use case: every read resolves them. */
  : { references: Loads<References> })
