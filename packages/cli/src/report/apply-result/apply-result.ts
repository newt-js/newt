import { join }          from 'node:path'
// --------------------------------------------------------
import { CommandResult } from '../../commands/command'
import { FileReport }    from '../report'
import { Report }        from '../report'

/** Writes what a command created, never over an existing file; with `dryRun`, only says what it would do. */
export async function applyResult(result: CommandResult, cwd: string, dryRun: boolean): Promise<Report> {
  const created = new Set<string>()
  const files: FileReport[] = []
  for (const change of result.changes) {
    const path = join(cwd, change.path)
    if (created.has(path) || await Bun.file(path).exists()) {
      files.push({ path: change.path, status: 'skipped' })
      continue
    }
    if (!dryRun) await Bun.write(path, change.content)
    created.add(path)
    files.push({ path: change.path, status: 'created' })
  }
  return { dryRun, files, warnings: result.warnings ?? [], nextSteps: result.nextSteps ?? [] }
}
