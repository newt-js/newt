import { describeOutboxContract } from '../../../../application/database/contract/describe-outbox-contract/describe-outbox-contract'
import { MemoryDatabase }         from '../memory-database/memory-database'

describeOutboxContract('MemoryOutbox', { open: async () => new MemoryDatabase() })
