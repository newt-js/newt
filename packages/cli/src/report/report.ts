export type FileReport = { path: string, status: 'created' | 'skipped' }

export type Report = { dryRun: boolean, files: FileReport[], warnings: string[], nextSteps: string[] }
