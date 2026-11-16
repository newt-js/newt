import { MigrationRunner }      from '../migration-runner/migration-runner'
import type { MigrationTarget } from '../migration-target'
import type { Migrations }      from '../migrations'

export function databaseMigrations(target: MigrationTarget, framework: string, own: string | undefined): Migrations {
  const newt = new MigrationRunner(target, framework, 'newt_framework_migrations')
  const app = new MigrationRunner(target, own, 'newt_migrations')
  return {
    up: async () => {
      await newt.up()
      return app.up()
    },
    down: () => app.down(),
    status: () => app.status(),
  }
}
