import { FindOptions } from './records/find-options'

export type ReadOptions<Row> = FindOptions<Row> & { everyScope?: boolean | undefined }
