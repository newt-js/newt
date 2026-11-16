import type { ContextNames } from '../../names/context-names/context-names'

export type StorageTemplate = {
  imports: string[]
  body: (names: ContextNames) => string
  env: (names: ContextNames, publicUrl: string) => Record<string, string>
  testEnv: (names: ContextNames) => Record<string, string>
  needsService: boolean
  servesFiles: boolean
}

const secret = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')

export const STORAGES = {
  local: {
    imports: ["import { LocalStorage } from '@newt-js/core/files/local'", "import { requiredEnv } from '../../env'"],
    body: ({ env, folder }) => `  const storage = await LocalStorage.open({
    folder: Bun.env.${env}_FILES ?? 'data/files/${folder}',
    baseUrl: \`\${requiredEnv('PUBLIC_URL')}\${router.prefix}\${FILES_PATH}\`,
    secret: requiredEnv('${env}_FILES_SECRET'),
  })
  router.get(\`\${FILES_PATH}/*\`, request => storage.handler(request), { public: true })
  router.put(\`\${FILES_PATH}/*\`, request => storage.handler(request), { public: true, maxBodyBytes: MAX_UPLOAD_BYTES })
  return { private: storage }`,
    env: ({ env, folder }, publicUrl) => ({ PUBLIC_URL: publicUrl, [`${env}_FILES`]: `data/files/${folder}`, [`${env}_FILES_SECRET`]: secret() }),
    testEnv: ({ env, folder }) => ({ PUBLIC_URL: 'http://localhost', [`${env}_FILES`]: `data/test/files/${folder}`, [`${env}_FILES_SECRET`]: 'a-secret-for-the-tests-only-not-for-real-use' }),
    needsService: false,
    servesFiles: true,
  },
  s3: {
    imports: ["import { S3Storage } from '@newt-js/core/files/s3'", "import { requiredEnv } from '../../env'"],
    body: ({ env }) => `  return {
    private: await S3Storage.open({
      bucket: requiredEnv('${env}_S3_BUCKET'),
      accessKeyId: requiredEnv('${env}_S3_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('${env}_S3_SECRET_ACCESS_KEY'),
      region: Bun.env.${env}_S3_REGION ?? 'us-east-1',
      endpoint: Bun.env.${env}_S3_ENDPOINT,
    }),
  }`,
    env: ({ env, folder }) => ({ [`${env}_S3_BUCKET`]: folder, [`${env}_S3_ACCESS_KEY_ID`]: '', [`${env}_S3_SECRET_ACCESS_KEY`]: '', [`${env}_S3_REGION`]: 'us-east-1', [`${env}_S3_ENDPOINT`]: '' }),
    testEnv: () => ({}),
    needsService: true,
    servesFiles: false,
  },
  memory: {
    imports: ["import { MemoryStorage } from '@newt-js/core/files/memory'"],
    body: () => '  return { private: new MemoryStorage() }',
    env: () => ({}),
    testEnv: () => ({}),
    needsService: false,
    servesFiles: false,
  },
} satisfies Record<string, StorageTemplate>

export type StorageName = keyof typeof STORAGES
