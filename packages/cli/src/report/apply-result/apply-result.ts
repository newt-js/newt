import { join }               from 'node:path'
// --------------------------------------------------------
import { applyChange }        from '../../changes/apply-change/apply-change'
import { paddedClasses }      from '../../changes/padded-classes/padded-classes'
import { sortedImports }      from '../../changes/sorted-imports/sorted-imports'
import { syntaxErrors }       from '../../changes/syntax-errors/syntax-errors'
import { virtualFiles }       from '../../changes/virtual-files/virtual-files'
import { writeFiles }         from '../../changes/write-files/write-files'
import type { CommandResult } from '../../commands/command'
import { CommandError }       from '../../commands/command-error/command-error'
import { mergedReports }      from '../merged-reports/merged-reports'
import type { FileReport }    from '../report'
import type { Report }        from '../report'

/** Makes a command's changes in memory, then writes them all, or none when one cannot be made; with `dryRun`, only says what they would do. */
export async function applyResult(result: CommandResult, cwd: string, dryRun: boolean): Promise<Report> {
  const files = virtualFiles(cwd)
  const reports: FileReport[] = []
  const warnings: string[] = []
  const failures: string[] = []
  for (const change of result.changes) {
    const { warnings: changeWarnings, failed, ...outcome } = await applyChange(change, files)
    reports.push({ path: change.path, ...outcome })
    if (failed) failures.push(...changeWarnings)
    else warnings.push(...changeWarnings)
  }
  for (const [path, content] of files.changed()) {
    if (content !== null && /(?<!\.d)\.ts$/.test(path)) await files.write(path, paddedClasses(path, sortedImports(path, (await files.read(path))!)))
  }
  for (const [path, content] of files.changed()) {
    const file = Bun.file(join(cwd, path))
    const before = await file.exists() ? await file.text() : null
    if (syntaxErrors(path, content) > syntaxErrors(path, before)) failures.push(`newt's change would leave ${path} with syntax errors: tell newt's authors, and make it by hand`)
  }
  if (failures.length > 0) {
    throw new CommandError(`newt wrote nothing, since its changes go together and some cannot be made:\n${failures.map(failure => `- ${failure}`).join('\n')}`)
  }
  await writeFiles(cwd, files.changed(), dryRun)
  return { dryRun, files: mergedReports(reports), warnings: [...warnings, ...result.warnings ?? []], nextSteps: result.nextSteps ?? [] }
}
