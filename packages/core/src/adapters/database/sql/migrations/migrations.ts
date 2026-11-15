export type MigrationStatus = { applied: string[], pending: string[], changed: string[] }

export interface Migrations {
  up(): Promise<string[]>
  down(): Promise<string | null>
  status(): Promise<MigrationStatus>
}
