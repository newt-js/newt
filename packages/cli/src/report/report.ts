export type FileReport = { path: string, status: 'created' | 'updated' | 'skipped', note?: string }

export type Report = { dryRun: boolean, files: FileReport[], warnings: string[], nextSteps: string[] }
