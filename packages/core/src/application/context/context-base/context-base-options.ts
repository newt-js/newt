import type { Clock }              from '../../../domain/clock/clock'
import type { EmailSender }        from '../../../domain/email/email-sender'
import type { StorageOptions }     from '../../../domain/file-storage/files/storage-options'
import type { ConflictRetries }    from '../../../domain/use-case/conflict-retries/conflict-retries'
import type { GuardRule }          from '../../../domain/use-case/guard-rule'
import type { WriteRule }          from '../../../domain/use-case/write-rule'
import type { Database }           from '../../database/database'
import { Platform }                from '../../platform/platform/platform'
import type { WorkerOptionsGiven } from '../../runtime/worker/worker-options'

export type ContextBaseOptions = {
  name: string
  platform: Platform
  database: Database
  clock?: Clock | undefined
  worker?: WorkerOptionsGiven | undefined
  writeRule?: WriteRule | undefined
  guardRule?: GuardRule | undefined
  conflictRetries?: Partial<ConflictRetries> | undefined
  storage?: StorageOptions | undefined
  email?: EmailSender | undefined
}
