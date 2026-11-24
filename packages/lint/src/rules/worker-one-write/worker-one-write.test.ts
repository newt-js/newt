import { mkdtempSync }    from 'node:fs'
import { writeFileSync }  from 'node:fs'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { asRule }         from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { workerOneWrite } from './worker-one-write'

// A module whose workers run `sendEmail` and `spend`, on disk: the rule reads its workers.ts beside it.
const folder = mkdtempSync(join(tmpdir(), 'worker-one-write-'))
writeFileSync(join(folder, 'link.workers.ts'), "links.on(deps.user.events.created, 'sendEmail', created => [created.id])\nlinks.on(links.events.used, \"spend\", used => [used.id])\n")
const LINK_MODULE = join(folder, 'link.module.ts')
const OTHER_MODULE = join(folder, 'other.module.ts')
const linkModule = (body: string, more = '') => `export class Link_Module extends Module {\n@UseCase()\nasync sendEmail(id: string) {\n${body}\n}\n${more}\n}`

tester.run('worker-one-write', asRule(workerOneWrite), {
  valid: [
    // The email first, the one write last, and what is there handed back.
    { code: linkModule('const link = Link.create(id)\nsendEmail(link)\nawait this.repository.persist(link)\nreturn link.toDTO()'), filename: LINK_MODULE },
    // Everything written at once.
    { code: linkModule('await this.repository.persist([link, ...earlier])'), filename: LINK_MODULE },
    // One write in each branch.
    { code: linkModule('if (id) { await this.repository.persist(a) } else { await this.repository.persist(b) }'), filename: LINK_MODULE },
    // A use case no worker runs writes as it needs.
    { code: `export class Link_Module extends Module {\n@UseCase()\nasync resend(id: string) {\nawait this.repository.persist(a)\nsendEmail(a)\n}\n}`, filename: LINK_MODULE },
    // A module with no workers.
    { code: linkModule('await this.repository.persist(a)\nsendEmail(a)'), filename: OTHER_MODULE },
  ],
  invalid: [
    // The email after the write: never retried.
    { code: linkModule('await this.repository.persist(link)\nsendEmail(link)'), filename: LINK_MODULE, errors: [{ messageId: 'afterWrite', data: { useCase: 'sendEmail' } }] },
    // Two writes.
    { code: linkModule('await this.repository.persist(a)\nawait this.repository.persist(b)'), filename: LINK_MODULE, errors: [{ messageId: 'afterWrite' }] },
    // A return that does more.
    { code: linkModule('await this.repository.persist(a)\nreturn await this.deps.user.verify(id)'), filename: LINK_MODULE, errors: [{ messageId: 'afterWrite' }] },
    // In the method of the class it calls, and after the call that writes.
    { code: linkModule('await this.write(id)\nnotify(id)', 'private async write(id: string) {\nawait this.repository.persist(a)\nsendEmail(a)\n}'), filename: LINK_MODULE, errors: [{ messageId: 'afterWrite', line: 5 }, { messageId: 'afterWrite', line: 9 }] },
    // Inside a branch.
    { code: linkModule('if (id) {\nawait this.repository.persist(a)\nsendEmail(a)\n}'), filename: LINK_MODULE, errors: [{ messageId: 'afterWrite' }] },
    // A write in a loop.
    { code: linkModule('for (const each of links) { await this.repository.persist(each) }'), filename: LINK_MODULE, errors: [{ messageId: 'inLoop' }] },
    // The other use case the workers run, its name in double quotes.
    { code: `export class Link_Module extends Module {\n@UseCase()\nasync spend(id: string) {\nawait this.repository.persist(a)\nawait this.deps.user.verify(id)\n}\n}`, filename: LINK_MODULE, errors: [{ messageId: 'afterWrite', data: { useCase: 'spend' } }] },
  ],
})
