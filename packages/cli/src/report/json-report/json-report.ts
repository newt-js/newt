import { Report } from '../report'

export function jsonReport(report: Report): string {
  return JSON.stringify(report, null, 2)
}
