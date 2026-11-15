import { SqlRun }            from '../../dialect/sql-run'
import { migrationChecksum } from '../migration-checksum/migration-checksum'
import { MigrationPair }     from '../migration-files/migration-files'
import { migrationFiles }    from '../migration-files/migration-files'
import { migrationName }     from '../migration-name/migration-name'
import { MigrationTarget }   from '../migration-target'
import { MigrationStatus }   from '../migrations'
import { Migrations }        from '../migrations'

type Applied = { version: number, name: string, checksum: string }

type Script = MigrationPair & { upSql: string, downSql: string }

export class MigrationRunner implements Migrations {

  constructor(
    private readonly target: MigrationTarget,
    private readonly folder: string | undefined,
    private readonly table: string,
  ) {}

  async up(): Promise<string[]> {
    const scripts = await this.scripts()
    return this.locked(async run => {
      await this.prepare(run)
      const applied = await this.applied(run)
      const last = applied.at(-1)
      if (last && !scripts.some(script => script.version === last.version && script.name === last.name)) {
        throw new Error(`Last applied migration ${migrationName(last.version, last.name)} is not in the migrations folder`)
      }
      this.verifyChecksums(applied, scripts)
      const done = new Set(applied.map(record => record.version))
      const pending = scripts.filter(script => !done.has(script.version))
      for (const script of pending) {
        for (const statement of this.target.statements(script.upSql)) {
          await run(statement)
        }
        await run(`INSERT INTO ${this.quoted} (version, name, checksum) VALUES (${this.target.param(1)}, ${this.target.param(2)}, ${this.target.param(3)})`, [script.version, script.name, migrationChecksum(script.upSql)])
      }
      return pending.map(script => migrationName(script.version, script.name))
    })
  }

  async down(): Promise<string | null> {
    const scripts = await this.scripts()
    return this.locked(async run => {
      await this.prepare(run)
      const last = (await this.applied(run)).at(-1)
      if (!last) {
        return null
      }
      const script = scripts.find(each => each.version === last.version && each.name === last.name)
      if (!script) {
        throw new Error(`Migration file for ${migrationName(last.version, last.name)} not found`)
      }
      for (const statement of this.target.statements(script.downSql)) {
        await run(statement)
      }
      await run(`DELETE FROM ${this.quoted} WHERE version = ${this.target.param(1)}`, [script.version])
      return migrationName(script.version, script.name)
    })
  }

  async status(): Promise<MigrationStatus> {
    const scripts = await this.scripts()
    const applied = await this.target.read(async run => (await this.target.tableExists(run, this.table) ? this.applied(run) : []))
    const done = new Set(applied.map(record => record.version))
    const changed = applied
      .filter(record => scripts.some(script => script.version === record.version && script.name === record.name && migrationChecksum(script.upSql) !== record.checksum))
      .map(record => migrationName(record.version, record.name))
    return {
      applied: applied.map(record => migrationName(record.version, record.name)),
      pending: scripts.filter(script => !done.has(script.version)).map(script => migrationName(script.version, script.name)),
      changed,
    }
  }

  private get quoted(): string {
    return this.target.quote(this.table)
  }

  private locked<T>(fn: (run: SqlRun) => Promise<T>): Promise<T> {
    return this.target.transaction(`newt_migrations:${this.table}`, fn)
  }

  private async prepare(run: SqlRun): Promise<void> {
    if (!await this.target.tableExists(run, this.table)) {
      await run(`CREATE TABLE ${this.quoted} (version INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL, checksum VARCHAR(64) NOT NULL)`)
    }
  }

  private verifyChecksums(applied: Applied[], scripts: Script[]): void {
    for (const record of applied) {
      const script = scripts.find(each => each.version === record.version && each.name === record.name)
      if (script && migrationChecksum(script.upSql) !== record.checksum) {
        throw new Error(`Migration ${migrationName(record.version, record.name)} was changed after it was applied: put its up file back as it was, and make the change a new migration`)
      }
    }
  }

  private async applied(run: SqlRun): Promise<Applied[]> {
    const rows = await run(`SELECT version, name, checksum FROM ${this.quoted} ORDER BY version`)
    return rows.map(row => ({ version: Number(row.version), name: String(row.name), checksum: String(row.checksum) }))
  }

  private async scripts(): Promise<Script[]> {
    const pairs = await migrationFiles(this.folder)
    return Promise.all(pairs.map(async pair => ({ ...pair, upSql: await Bun.file(pair.up).text(), downSql: await Bun.file(pair.down).text() })))
  }
}
