import { columns }         from '../../text/columns/columns'
import type { FileReport } from '../report'
import type { Report }     from '../report'

const DONE = { created: 'created', updated: 'updated', removed: 'removed', skipped: 'skipped' }
const PLANNED = { created: 'will create', updated: 'will update', removed: 'will remove', skipped: 'will skip' }

function fileLine(file: FileReport, dryRun: boolean): [string, string] {
  const path = file.note ? `${file.path} (${file.note})` : file.path
  return [(dryRun ? PLANNED : DONE)[file.status], path]
}

function listSection(title: string, items: string[]): string[] {
  return items.length === 0 ? [] : [title, ...items.map(item => `  ${item}`)]
}

export function humanReport(report: Report): string {
  const nothingToDo = report.files.length === 0 && report.warnings.length === 0
  return [
    report.dryRun ? ['Dry run: nothing was written.'] : [],
    nothingToDo ? ['Nothing to do.'] : columns(report.files.map(file => fileLine(file, report.dryRun))),
    listSection('Warnings:', report.warnings),
    listSection('Next steps:', report.nextSteps),
  ]
    .filter(section => section.length > 0)
    .map(section => section.join('\n'))
    .join('\n\n')
}
