import { MODULE }          from '../../testing/testing'
import { asRule }          from '../../testing/testing'
import { tester }          from '../../testing/testing'
import { frameworkTables } from './framework-tables'

const REPOSITORY = `${MODULE}/price-change.repository.ts`

tester.run('framework-tables', asRule(frameworkTables), {
  valid: [
    { code: "base.database.records<OrderRow>('order')", filename: REPOSITORY },
    { code: "base.database.records<OrderRow>('order_newt_view')", filename: REPOSITORY },
    { code: "connection.query('SELECT * FROM price_change WHERE id = ?')", filename: REPOSITORY },
    { code: "const label = 'newt_job'", filename: `${MODULE}/price-change.ts` },
    { code: 'base.database.records(name)', filename: REPOSITORY },
    { code: "run('CREATE TABLE knewtonian (id TEXT)')", filename: '/repo/scripts/setup.ts' },
  ],
  invalid: [
    { code: "base.database.records<JobRow>('newt_job')", filename: REPOSITORY, errors: [{ messageId: 'reserved', data: { name: 'newt_job' } }] },
    { code: 'base.database.records(`newt_job_queue`)', filename: '/repo/scripts/report.ts', errors: [{ messageId: 'reserved', data: { name: 'newt_job_queue' } }] },
    // A table of the app's own with newt's prefix would sit where newt's go.
    { code: "base.database.records<CacheRow>('newt_cache')", filename: REPOSITORY, errors: [{ messageId: 'reserved' }] },
    { code: "connection.query('SELECT count(*) FROM newt_job WHERE status = ?')", filename: '/repo/src/shared/outbox/outbox.ts', errors: [{ messageId: 'reserved', data: { name: 'newt_job' } }] },
    { code: 'admin.unsafe(`DELETE FROM "newt_schedule_tick" WHERE id = ${id}`)', filename: '/repo/scripts/reset.ts', errors: [{ messageId: 'reserved', data: { name: 'newt_schedule_tick' } }] },
    { code: "run('SELECT * FROM public.newt_migrations')", filename: '/repo/scripts/report.ts', errors: [{ messageId: 'reserved', data: { name: 'newt_migrations' } }] },
    { code: "run('CREATE TABLE IF NOT EXISTS newt_cache (id TEXT)')", filename: '/repo/scripts/setup.ts', errors: [{ messageId: 'reserved', data: { name: 'newt_cache' } }] },
    { code: "run('CREATE INDEX job_status ON `newt_job` (status)')", filename: `${MODULE}/migrations/00002_index_up.ts`, errors: [{ messageId: 'reserved', data: { name: 'newt_job' } }] },
    { code: "run('ALTER TABLE newt_job ADD COLUMN note TEXT')", filename: '/repo/scripts/setup.ts', errors: [{ messageId: 'reserved' }] },
  ],
})
