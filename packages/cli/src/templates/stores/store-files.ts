export type StoreFiles = {
  imports: string[]
  constants: string
  body: string
  env: (port: number, example: boolean) => Record<string, string>
  testEnv: Record<string, string>
  usesEnvOf: boolean
  needsEnv: boolean
  className: string
  contextEnv: ContextVariables
  contextTestEnv: ContextVariables
}

type ContextVariables = (env: string, folder: string) => Record<string, string>

const none: ContextVariables = () => ({})

const secret = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')

export const STORE_FILES = {
  local: {
    imports: ["import { LocalStorage } from '@newt-js/core/files/local'"],
    constants: 'const MAX_UPLOAD_BYTES = 100 * 1024 * 1024\n',
    body: `  const path = \`/files/\${context}\`
  const storage = await LocalStorage.open({
    folder: Bun.env[\`\${envOf(context)}_FILES\`] ?? \`data/files/\${context}\`,
    baseUrl: \`\${requiredEnv('PUBLIC_URL')}\${router.prefix}\${path}\`,
    secret: requiredEnv('FILES_SECRET'),
  })
  router.get(\`\${path}/*\`, request => storage.handler(request), { public: true })
  router.put(\`\${path}/*\`, request => storage.handler(request), { public: true, maxBodyBytes: MAX_UPLOAD_BYTES })
  return { private: storage }`,
    env: (port, example) => ({ PUBLIC_URL: `http://localhost:${port}`, FILES_SECRET: example ? '' : secret() }),
    testEnv: { PUBLIC_URL: 'http://localhost', FILES_SECRET: 'a-secret-for-the-tests-only-not-for-real-use' },
    usesEnvOf: true,
    needsEnv: true,
    className: 'LocalStorage',
    contextEnv: (env, folder) => ({ [`${env}_FILES`]: `data/files/${folder}` }),
    contextTestEnv: (env, folder) => ({ [`${env}_FILES`]: `data/test/files/${folder}` }),
  },
  s3: {
    imports: ["import { S3Storage } from '@newt-js/core/files/s3'"],
    constants: '',
    body: `  return {
    private: await S3Storage.open({
      bucket: requiredEnv(\`\${envOf(context)}_S3_BUCKET\`),
      accessKeyId: requiredEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('S3_SECRET_ACCESS_KEY'),
      region: Bun.env.S3_REGION ?? 'us-east-1',
      endpoint: Bun.env.S3_ENDPOINT,
    }),
  }`,
    env: () => ({ S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '', S3_REGION: 'us-east-1', S3_ENDPOINT: '' }),
    testEnv: {},
    usesEnvOf: true,
    needsEnv: true,
    className: 'S3Storage',
    contextEnv: (env, folder) => ({ [`${env}_S3_BUCKET`]: folder }),
    contextTestEnv: none,
  },
  memory: {
    imports: ["import { MemoryStorage } from '@newt-js/core/files/memory'"],
    constants: '',
    body: '  return { private: new MemoryStorage() }',
    env: () => ({}),
    testEnv: {},
    usesEnvOf: false,
    needsEnv: false,
    className: 'MemoryStorage',
    contextEnv: none,
    contextTestEnv: none,
  },
} satisfies Record<string, StoreFiles>

export type FilesKind = keyof typeof STORE_FILES
