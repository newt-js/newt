/** A context's bucket, `<backend>--<context>`: the two apart by a mark neither name holds, so two backends never share one. */
export const bucketName = (backend: string, folder: string) => [backend, folder].map(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).join('--')

/** A context's files: the adapter of core its <context>.context.ts opens, `localFiles()`, and the backend's and its own variables in .env. */
export type StoreFiles = {
  adapter: string
  from: string
  env: (port: number, example: boolean) => Record<string, string>
  contextEnv: ContextVariables
}

/** A context's variables, from its env prefix, its folder and its backend's package name. */
type ContextVariables = (env: string, folder: string, backend: string) => Record<string, string>

const none: ContextVariables = () => ({})

const secret = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')

export const STORE_FILES = {
  local: {
    adapter: 'localFiles',
    from: '@newt-js/core/files/local',
    env: (port, example) => ({ PUBLIC_URL: `http://localhost:${port}`, FILES_SECRET: example ? '' : secret() }),
    contextEnv: (env, folder) => ({ [`${env}_FILES`]: `data/files/${folder}` }),
  },
  s3: {
    adapter: 's3Files',
    from: '@newt-js/core/files/s3',
    env: () => ({ S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '', S3_REGION: 'us-east-1', S3_ENDPOINT: '' }),
    contextEnv: (env, folder, backend) => ({ [`${env}_S3_BUCKET`]: bucketName(backend, folder) }),
  },
  memory: {
    adapter: 'memoryFiles',
    from: '@newt-js/core/files/memory',
    env: () => ({}),
    contextEnv: none,
  },
} satisfies Record<string, StoreFiles>

export type FilesKind = keyof typeof STORE_FILES
