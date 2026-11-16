import { mkdirSync }     from 'node:fs'
import { mkdtempSync }   from 'node:fs'
import { writeFileSync } from 'node:fs'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { MODULE }        from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { moduleFiles }   from './module-files'

/** A module whose other entity, a board's counter, has its repository beside it; its orphan has none. */
const CARD = join(mkdtempSync(join(tmpdir(), 'newt-lint-files-')), 'src/contexts/boards/modules/card')
mkdirSync(CARD, { recursive: true })
for (const file of ['card-counter.ts', 'card-counter.repository.ts', 'card-orphan.ts']) writeFileSync(join(CARD, file), '')

const FILES = ['price-change.module.ts', 'price-change.ts', 'price-change.schema.ts', 'price-change.repository.ts', 'price-change.routes.ts', 'price-change.workers.ts', 'price-change.deps.ts', 'price-change-options.ts', 'price-change.test.ts', 'events/price-change-recorded.ts', 'errors/price-not-found.ts', 'value-objects/price-change-id.ts', 'services/price-rounding.ts']

tester.run('module-files', asRule(moduleFiles), {
  valid: [
    ...FILES.map(file => ({ code: '', filename: `${MODULE}/${file}` })),
    { code: '', filename: '/repo/src/contexts/ws/ws.context.ts' },
    { code: '', filename: '/repo/examples/shop/modules/order/order.workers.ts' },
  ],
  invalid: [
    { code: '', filename: `${MODULE}/helpers.ts`, errors: [{ messageId: 'file' }] },
    // A second entity of the module, with or without its repository: a module keeps one.
    { code: '', filename: join(CARD, 'card-counter.ts'), errors: [{ messageId: 'file' }] },
    { code: '', filename: join(CARD, 'card-counter.repository.ts'), errors: [{ messageId: 'file' }] },
    { code: '', filename: join(CARD, 'card-orphan.ts'), errors: [{ messageId: 'file' }] },
    { code: '', filename: join(CARD, 'card-ghost.repository.ts'), errors: [{ messageId: 'file' }] },
    { code: '', filename: join(CARD, 'board-counter.ts'), errors: [{ messageId: 'file' }] },
    { code: '', filename: `${MODULE}/utils/format.ts`, errors: [{ messageId: 'folder' }] },
    { code: '', filename: `${MODULE}/infrastructure/price-change.table.ts`, errors: [{ messageId: 'folder' }] },
    { code: '', filename: `${MODULE}/events/recorded.ts`, errors: [{ messageId: 'event' }] },
    ...['constructor', 'toString', '__proto__'].map(folder => ({ code: '', filename: `${MODULE}/${folder}/x.ts`, errors: [{ messageId: 'folder' }] })),
    { code: '', filename: `${process.cwd()}/modules/order/helpers.ts`, errors: [{ messageId: 'file' }] },
  ],
})
