export type RowCount<Row, K extends keyof Row> = Pick<Row, K> & { count: number }
