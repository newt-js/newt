import { asRule }       from '../../testing/testing'
import { tester }       from '../../testing/testing'
import { useCaseReads } from './use-case-reads'

const CARD_MODULE = '/repo/src/contexts/boards/features/boards/card/card.module.ts'
const cardModule = (body: string) => `export class Card_Module extends Module {\n${body}\n}`

tester.run('use-case-reads', asRule(useCaseReads), {
  valid: [
    { code: cardModule('async find(criteria: CardFilterDTO, sort?: CardSortDTO) {}\nasync get(id: CardId) {}\nasync paginate(criteria: CardFilterDTO, page: PageRequest) {}\nasync search(text: SearchText, page: PageRequest) {}'), filename: CARD_MODULE },
    // Not a module.
    { code: cardModule('async search(input: CardSearchDTO) {}'), filename: '/repo/src/contexts/boards/features/boards/card/card.ts' },
    { code: cardModule('private async search(input: CardSearchDTO) {}'), filename: CARD_MODULE },
  ],
  invalid: [
    { code: cardModule('async find(criteria: CardFilterDTO, text: string) {}'), filename: CARD_MODULE, errors: [{ messageId: 'text' }] },
    { code: cardModule('async paginate(query: SearchText, page: PageRequest) {}'), filename: CARD_MODULE, errors: [{ messageId: 'text' }] },
    { code: cardModule('async search(input: CardSearchDTO, page: PageRequest) {}'), filename: CARD_MODULE, errors: [{ messageId: 'search' }] },
    { code: cardModule('async search(text: SearchText, page: PageRequest, filter: CardFilterDTO) {}'), filename: CARD_MODULE, errors: [{ messageId: 'search' }] },
  ],
})
