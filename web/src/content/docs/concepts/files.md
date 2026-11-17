---
title: Files
description: Where a context keeps files, and how browsers upload and download them safely.
sidebar:
  order: 15
---

A context's storage is the place where it keeps files: attachments, avatars, exports. It exists so your modules can save and serve files without caring whether they live on disk, in S3 or in memory.

## Private and public files

Each context has two kinds of storage. You give either, both or none.

| Kind | Who reads a file | How |
|---|---|---|
| `private` | Only someone your use case hands a link to | A signed link that expires |
| `public` | Anyone with the address | A plain, permanent address |

Most files are private: task attachments, documents. Public storage fits files meant for everyone, such as a project's logo.

## How a context gets its storage

The context opens its storage in `src/stores.ts` and passes it to `ContextBase` as `storage`. This is what `newt init` generates for local files:

```ts title="src/stores.ts"
export async function openStorage(context: string, router: HttpRouter, stores: Stores): Promise<StorageOptions> {
  if (stores === 'memory') {
    return { private: new MemoryStorage() }
  }
  const path = `/${context}/files`
  const storage = await LocalStorage.open({
    folder: Bun.env[`${envOf(context)}_FILES`] ?? `data/files/${context}`,
    baseUrl: `${requiredEnv('PUBLIC_URL')}${router.prefix}${path}`,
    secret: requiredEnv('FILES_SECRET'),
  })
  router.get(`${path}/*`, request => storage.handler(request), { public: true })
  router.put(`${path}/*`, request => storage.handler(request), { public: true, maxBodyBytes: MAX_UPLOAD_BYTES })
  return { private: storage }
}
```

```ts title="src/contexts/tasks/tasks.context.ts"
const base = new ContextBase({ name: 'tasks', platform, database, storage: await openStorage('tasks', router, stores) })
```

`StorageOptions` has two optional fields:

| Field | Type |
|---|---|
| `private` | `StorageAdapter` |
| `public` | `PublicStorageAdapter` |

A context opens without storage. It only fails when a module reaches for a kind it was not given: `The context 'tasks' was given no private storage: ContextBaseOptions.storage.private`.

## Files in a module

A module takes its own folder of the context's storage with `in(name)`:

```ts title="src/contexts/tasks/modules/task/task.module.ts"
import type { PrivateFiles } from '@newt-js/core'

export class Task_Module extends Module {
  private readonly attachments: PrivateFiles

  private constructor(base: ContextBase, private readonly tasks: Task_Repository, private readonly deps: Task_Deps) {
    super('task', base.useCaseRunner, deps)
    this.attachments = base.storage.private.in('task')
    // ...
  }
}
```

Every key gets the context's name in front, then each `in` prefix. `this.attachments.put('t1/report.pdf', ...)` is stored as `tasks/task/t1/report.pdf`. Two contexts that share one bucket or folder never see each other's files.

### Keys

A key is a path of names joined by `/`.

- Each name starts with a letter or digit, then letters, digits, `.`, `_` or `-`.
- Each name has 128 characters at most.
- The full key, with its prefixes, has 900 characters at most.

Anything else throws before the adapter sees it, so a key such as `../x` can never leave its place:

```text
'tasks/task/../x' is no storage key: names of letters, digits, '.', '_' and '-', joined by '/'
```

## Methods

Both `PrivateFiles` and `PublicFiles` have these:

| Method | Returns | What it does |
|---|---|---|
| `in(prefix)` | the same kind of files | A folder inside this one |
| `put(key, body, { contentType })` | `{ size, contentType }` | Saves a `Blob`, `Uint8Array` or `string`, replacing what was there |
| `open(key)` | `{ size, contentType, stream }` or `null` | Reads a file as a stream |
| `stat(key)` | `{ size, contentType }` or `null` | Says how long a file is and its type |
| `delete(key)` | nothing | Removes a file. Deleting a missing file is no error, so a job may run twice |
| `uploadUrl(key, options)` | `{ url, headers }` | An address a browser uploads one file to |
| `verifyUpload(key, rule)` | `null` or a refusal | Checks what the browser uploaded |

Only `PrivateFiles` has `signedUrl(key, options)`. Only `PublicFiles` has `url(key)`.

A missing file is `null`, never an error.

## Uploads from the browser

Files go straight from the browser to the storage, not through your use case. It takes three steps:

1. A use case asks for an upload address with `uploadUrl`.
2. The browser sends the file there with `PUT`, with the headers it was given.
3. Another use case checks the upload with `verifyUpload` and only then records it.

```ts title="src/contexts/tasks/modules/task/task.module.ts"
@UseCase()
async attachmentUploadUrl(input: { id: string, size: number }): Promise<UploadAddress> {
  return this.attachments.uploadUrl(`${input.id}/report.pdf`, {
    expiresIn: 600,
    contentType: 'application/pdf',
    size: input.size,
    maxBytes: 10 * 1024 * 1024,
  })
}
```

```ts
const { url, headers } = await api.attachmentUploadUrl({ id, size: file.size })
await fetch(url, { method: 'PUT', headers, body: file })
```

`uploadUrl` options:

| Option | Required | Meaning |
|---|---|---|
| `expiresIn` | yes | Seconds the address works |
| `contentType` | yes | The only type the address accepts |
| `size` | yes | The exact length in bytes the address accepts |
| `maxBytes` | no | The most the file may be. Default: 1 MB (1,048,576 bytes) |

If `size` is over `maxBytes`, `uploadUrl` throws `UploadTooLarge` (kind `too_large`, code `upload_too_large`), which a route answers with `413`. A `size` that is not a whole number of 0 or more throws a plain error.

The address only takes the type and the length it was signed for. A browser that sends another type, more bytes or fewer bytes is refused.

### Checking an upload

The browser may lie, or never upload at all. Check before you trust the file:

```ts
const refusal = await this.attachments.verifyUpload(`${id}/report.pdf`, { contentType: 'application/pdf', maxBytes: 10 * 1024 * 1024 })
if (refusal) {
  throw new AttachmentRefused(refusal)
}
```

`verifyUpload` takes `contentType` and an optional `maxBytes` (1 MB by default). It returns `null` when the file is fine, or one of these:

| Refusal | Why |
|---|---|
| `'missing'` | Nothing was uploaded under the key |
| `'too_large'` | The file is longer than `maxBytes` |
| `'wrong_type'` | The file was stored with another type, or its bytes are of another type |

To catch the last case, newt reads the first 16 bytes and compares them with the signatures of known types: PNG, JPEG, GIF, WebP, AVIF, HEIC/HEIF, QuickTime, MP4, M4A, WebM, PDF, ZIP and Office files, gzip, and Windows and Linux executables. A file that claims to be a PNG but starts like an executable is `'wrong_type'`. A type with no signature, such as `text/csv`, passes unless its bytes look like a known type. An empty file fails any type that has a signature.

:::danger[Always verify]
Never record an uploaded file without `verifyUpload`. Until it returns `null`, the file may be missing, too large or something other than it claims.
:::

Refusals are values, not errors. Throw your own [error](/concepts/errors/) when you need one.

## Downloads

A private file is read through a signed link that expires:

```ts
@UseCase()
async attachmentUrl(input: { id: string }): Promise<string> {
  return this.attachments.signedUrl(`${input.id}/report.pdf`, {
    expiresIn: 300,
    contentType: 'application/pdf',
    filename: 'Report.pdf',
    disposition: 'inline',
  })
}
```

| Option | Required | Meaning |
|---|---|---|
| `expiresIn` | yes | Seconds the link works |
| `contentType` | yes | The type the file is served as |
| `filename` | no | The name the browser saves it under |
| `disposition` | no | `'attachment'` (download, the default) or `'inline'` (show in the browser) |

The file is served with the type your use case says, whatever the browser uploaded with it.

:::caution[Inline is only for safe types]
`inline` works only for PNG, JPEG, GIF, WebP, AVIF and PDF. Anything else, such as HTML or SVG, is always downloaded, so an uploaded page can never run in your site.
:::

## Public files

Public files have a permanent address and need no signing:

```ts
const logos = base.storage.public.in('project')
await logos.put(`${id}/logo.png`, bytes, { contentType: 'image/png' })
const address = logos.url(`${id}/logo.png`)
```

Uploads to public storage use the same `uploadUrl` and `verifyUpload` as private ones.

The generated `src/stores.ts` only sets up private storage. To add public storage, open a public adapter (`LocalPublicStorage`, `S3PublicStorage` or `MemoryPublicStorage`) and return it as `public`.

## Adapters

### Local

Keeps files in a folder on the server's disk. It is the default.

```ts
import { LocalStorage } from '@newt-js/core/files/local'

const storage = await LocalStorage.open({
  folder: 'data/files/tasks',
  baseUrl: 'http://localhost:3000/api/tasks/files',
  secret: Bun.env.FILES_SECRET!,
})
```

| Option | Required | Meaning |
|---|---|---|
| `folder` | yes | Where the files live. Created if missing |
| `baseUrl` | yes | The public address of the routes that serve the files |
| `secret` | yes | Signs upload and download links. 32 characters or more |
| `clock` | no | The clock that decides when links expire. Useful in tests |

:::caution
Keep `FILES_SECRET` out of your repository. Anyone who knows it can sign links to any file.
:::

Your server serves the files itself, through `storage.handler`. You mount it on two public routes, as the generated `stores.ts` does in the section "How a context gets its storage": `GET` for downloads and `PUT` for uploads. `maxBodyBytes` on the `PUT` route caps any upload (100 MB in the generated code). The handler answers:

| Status | When |
|---|---|
| `200` | Upload kept |
| `400` | The upload was shorter than signed |
| `403` | The signature is wrong or expired |
| `404` | No such file |
| `413` | The upload was longer than signed |
| `415` | The upload's type is not the signed one |

A file appears only once it is fully written. A broken upload leaves nothing behind.

`LocalPublicStorage` takes the same options. It also serves files without a signature, cached for a day, and `url(key)` returns `baseUrl/key`.

### S3

Keeps files in an S3 bucket, or any service that speaks S3 (MinIO, Cloudflare R2, and others).

```ts
import { S3Storage } from '@newt-js/core/files/s3'

const storage = await S3Storage.open({
  bucket: Bun.env.TASKS_S3_BUCKET!,
  accessKeyId: Bun.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY!,
  region: Bun.env.S3_REGION ?? 'us-east-1',
  endpoint: Bun.env.S3_ENDPOINT,
})
```

| Option | Required | Meaning |
|---|---|---|
| `bucket` | yes | The bucket's name |
| `accessKeyId` | yes | |
| `secretAccessKey` | yes | |
| `sessionToken` | no | For temporary credentials |
| `region` | no | |
| `endpoint` | no | The service's address, for anything that is not AWS |
| `virtualHostedStyle` | no | Address the bucket as `bucket.host` instead of `host/bucket` |

`open` checks the bucket can be reached and throws `The bucket '...' cannot be reached` if not. Browsers upload and download straight to and from the bucket, so your server never carries the bytes.

`S3PublicStorage` takes one more option, `publicUrl`: the address public files are read from. `url(key)` returns `publicUrl/key`.

### Memory

Keeps files in memory and forgets them when the process ends. For tests and trying things out.

```ts
import { MemoryStorage, MemoryPublicStorage } from '@newt-js/core/files/memory'

const storage = new MemoryStorage()
```

It takes no options. Its addresses start with `memory://`, and `storage.send(url, init)` plays the browser in a test:

```ts
const address = await files.uploadUrl('t1/report.pdf', { expiresIn: 600, contentType: 'application/pdf', size: 8 })
await storage.send(address.url, { method: 'PUT', headers: address.headers, body: '%PDF-1.7' })
expect(await files.verifyUpload('t1/report.pdf', { contentType: 'application/pdf' })).toBeNull()
```

## In tests

The generated tests open the backend with `stores: 'memory'`, so each context gets a fresh `MemoryStorage`. When you use `testContext`, pass the storage yourself:

```ts
context = testContext({ name: 'tasks', cluster: new MemoryCluster(), database, storage: { private: new MemoryStorage() } })
```

See [Testing](/guides/testing/).

## With the CLI

There is no `newt add` command for files. You choose the storage when you create a backend, with `--files local` (the default), `--files s3` or `--files memory`:

```sh
newt init newthub --files s3
```

See [`newt init`](/reference/cli/init/) and [`newt add backend`](/reference/cli/add-backend/). The environment variables each choice needs are in [Configuration](/reference/configuration/).
