import type { FileReport } from '../report/report'

export type ChangeOutcome = Omit<FileReport, 'path'> & { warnings: string[] }
