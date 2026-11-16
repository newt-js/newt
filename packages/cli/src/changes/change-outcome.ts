import type { FileReport } from '../report/report'

/** What a change did; `failed` when it could not be made as newt makes it, and so the command writes nothing. */
export type ChangeOutcome = Omit<FileReport, 'path'> & { warnings: string[], failed?: true }
