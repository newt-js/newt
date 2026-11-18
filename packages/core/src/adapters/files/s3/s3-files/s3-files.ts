import { envNameOf }         from '../../../../application/data/env/env'
import { requiredEnv }       from '../../../../application/data/env/env'
import type { FilesAdapter } from '../../../../application/data/files-adapter'
import { MemoryStorage }     from '../../memory/memory-storage/memory-storage'
import { S3Storage }         from '../s3-storage/s3-storage'

/** A context's files in the S3 bucket <CONTEXT>_S3_BUCKET names, reached with the S3_* variables; in memory for its tests. */
export function s3Files(): FilesAdapter {
  return {
    open: async (context, { place }) => {
      if (place === 'memory') return { private: new MemoryStorage() }
      return {
        private: await S3Storage.open({
          bucket: requiredEnv(`${envNameOf(context)}_S3_BUCKET`),
          accessKeyId: requiredEnv('S3_ACCESS_KEY_ID'),
          secretAccessKey: requiredEnv('S3_SECRET_ACCESS_KEY'),
          region: Bun.env.S3_REGION ?? 'us-east-1',
          ...Bun.env.S3_ENDPOINT ? { endpoint: Bun.env.S3_ENDPOINT } : {},
        }),
      }
    },
  }
}
