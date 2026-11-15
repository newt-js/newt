import { asRule }                  from '../../testing/testing'
import { tester }                  from '../../testing/testing'
import { repositoryPublicMethods } from './repository-public-methods'

const repositoryClass = (body: string, parent = 'Repository<Card, CardRow>') => `export class Card_Repository extends ${parent} {\n${body}\n}`

tester.run('repository-public-methods', asRule(repositoryPublicMethods), {
  valid: [
    { code: repositoryClass("constructor(base: Base) { super(base, base.database.records('card'), { scope: 'none' }) }\nprotected toEntity(row: CardRow) { return Card.fromDTO(row) }\nprotected override toRow(card: Card) { return card.toDTO() }\nprivate helper() {}\n#other() {}") },
    // Not a repository: a module's private helpers are its own.
    { code: repositoryClass('persistNew(card: Card) {}', 'Module') },
  ],
  invalid: [
    { code: repositoryClass('persistNew(card: Card) {}'), errors: [{ messageId: 'method', data: { method: 'persistNew', repository: 'Card_Repository' } }] },
    { code: repositoryClass('public inColumn(columnId: string) {}', 'BaseRepository<Card>'), errors: [{ messageId: 'method' }] },
    { code: repositoryClass('override async purge(criteria: Criteria<CardRow>) { return 0 }'), errors: [{ messageId: 'method' }] },
  ],
})
