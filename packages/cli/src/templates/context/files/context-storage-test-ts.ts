import type { ContextNames } from '../../../names/context-names/context-names'

export function contextStorageTestTs({ folder, type }: ContextNames): string {
  return `import { expect, test } from 'bun:test'
import { HttpRouter } from '@newt-js/core/http'
import { open${type}Storage } from './${folder}-storage'

test('${folder} keeps a file uploaded to its signed address, and serves it at another', async () => {
  const router = new HttpRouter()
  const storage = (await open${type}Storage(router)).private!
  const upload = await storage.uploadUrl('notes/hello.txt', { expiresIn: 60, contentType: 'text/plain', size: 5 })
  const put = await router.answer(new Request(upload.url, { method: 'PUT', headers: upload.headers, body: 'hello' }))
  expect(put?.ok).toBe(true)
  const download = await storage.signedUrl('notes/hello.txt', { expiresIn: 60, contentType: 'text/plain' })
  expect(await (await router.answer(new Request(download)))?.text()).toBe('hello')
})
`
}
