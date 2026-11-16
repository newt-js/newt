import { applyChange }        from '../../changes/apply-change/apply-change'
import { virtualFiles }       from '../../changes/virtual-files/virtual-files'
import type { CommandResult } from '../../commands/command'
import type { FileReport }    from '../report'
import type { Report }        from '../report'

/** Applies a command's changes, never over what is there; with `dryRun`, only says what they would do. */
export async function applyResult(result: CommandResult, cwd: string, dryRun: boolean): Promise<Report> {
  const files = virtualFiles(cwd, dryRun)
  const reports: FileReport[] = []
  const warnings: string[] = []
  for (const change of result.changes) {
    const { warnings: changeWarnings, ...outcome } = await applyChange(change, files)
    reports.push({ path: change.path, ...outcome })
    warnings.push(...changeWarnings)
  }
  return { dryRun, files: reports, warnings: [...warnings, ...result.warnings ?? []], nextSteps: result.nextSteps ?? [] }
}
