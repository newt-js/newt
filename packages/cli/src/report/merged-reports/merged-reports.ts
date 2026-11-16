import type { FileReport } from '../report'

const RANK: Record<FileReport['status'], number> = { skipped: 0, updated: 1, created: 2, removed: 3 }

/** One report per file, in the order each first comes: what was done to it most, created over updated; a file skipped for not being there is left out. */
export function mergedReports(reports: FileReport[]): FileReport[] {
  const byPath = new Map<string, FileReport>()
  for (const report of reports) {
    const known = byPath.get(report.path)
    if (!known) byPath.set(report.path, report)
    else if (report.status === 'removed' || (known.status !== 'removed' && RANK[report.status] > RANK[known.status])) byPath.set(report.path, report)
  }
  return [...byPath.values()].filter(report => !(report.status === 'skipped' && report.note === 'not there'))
}
