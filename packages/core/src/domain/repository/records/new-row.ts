import type { StoredRow } from './stored-row'

export type NewRow<Row extends StoredRow> = Omit<Row, 'version'>
