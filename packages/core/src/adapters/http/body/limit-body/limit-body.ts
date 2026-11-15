import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'
import { bodyReads }       from '../body-before-route/body-reads'
import { keepingParams }   from '../keeping-params/keeping-params'
import { limitedStream }   from '../limited-stream/limited-stream'
import { readUpTo }        from '../read-up-to/read-up-to'
import { streamOf }        from '../stream-of/stream-of'

const nativeBody = Object.getOwnPropertyDescriptor(Request.prototype, 'body')!.get!
const nativeUsed = Object.getOwnPropertyDescriptor(Request.prototype, 'bodyUsed')!.get!

export function limitBody(request: Request, max: number): void {
  const length = Number(request.headers.get('content-length') ?? '')
  if (length > max) {
    throw new PayloadTooLarge(max)
  }
  if (request.headers.has('content-length')) {
    return
  }
  const nativeClone = request.clone.bind(request) as () => Request
  let original = nativeBody.call(request) as ReadableStream<Uint8Array> | null
  if (!original) {
    return
  }
  let read: Promise<Uint8Array<ArrayBuffer>> | null = null
  let used = false
  let stream: ReadableStream<Uint8Array> | null = null
  let limited: ReadableStream<Uint8Array> | null = null
  const bytes = () => (read ??= readUpTo(limited ?? original!, max))
  bodyReads.set(request, bytes)
  const once = <T>(as: (bytes: Uint8Array<ArrayBuffer>) => T | Promise<T>) => async (): Promise<T> => {
    if (used) {
      throw new TypeError('Body already used')
    }
    used = true
    return as(await bytes())
  }
  const contentType = request.headers.get('content-type') ?? ''
  const asResponse = (body: Uint8Array<ArrayBuffer>) => new Response(body, { headers: { 'content-type': contentType } })
  const methods = {
    bytes: once(body => body),
    arrayBuffer: once(body => body.buffer),
    text: once(body => new TextDecoder().decode(body)),
    json: once(body => JSON.parse(new TextDecoder().decode(body)) as unknown),
    blob: once(body => asResponse(body).blob()),
    formData: once(body => asResponse(body).formData()),
  }
  for (const [name, value] of Object.entries(methods)) {
    Object.defineProperty(request, name, { value, configurable: true })
  }
  Object.defineProperty(request, 'bodyUsed', { get: () => used || (!read && (nativeUsed.call(request) as boolean)), configurable: true })
  Object.defineProperty(request, 'body', {
    get: () => {
      if (!read) {
        return (limited ??= limitedStream(original!, max))
      }
      const bytesRead = read
      return (stream ??= streamOf(bytesRead, () => {
        used = true
      }))
    },
    configurable: true,
  })
  Object.defineProperty(request, 'clone', {
    value: () => {
      if (limited && !read && !used) {
        const [mine, theirs] = limited.tee()
        limited = mine
        return keepingParams(request, new Request(request.url, { method: request.method, headers: request.headers, body: theirs, duplex: 'half' } as RequestInit))
      }
      if (!read || used) {
        const copy = nativeClone()
        original = nativeBody.call(request) as ReadableStream<Uint8Array> | null
        return keepingParams(request, copy)
      }
      return keepingParams(request, new Request(request.url, { method: request.method, headers: request.headers, body: streamOf(read) }))
    },
    configurable: true,
  })
}
