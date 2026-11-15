import { Clock }              from '../../../domain/clock/clock'
import { StorageOptions }     from '../../../domain/file-storage/files/storage-options'
import { ConflictRetries }    from '../../../domain/use-case/conflict-retries/conflict-retries'
import { GuardRule }          from '../../../domain/use-case/guard-rule'
import { WriteRule }          from '../../../domain/use-case/write-rule'
import { Database }           from '../../database/database'
import { Platform }           from '../../platform/platform/platform'
import { WorkerOptionsGiven } from '../../runtime/worker/worker-options'

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
}
