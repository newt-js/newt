import { S3Client }         from 'bun'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { createHash }       from 'node:crypto'
import { createHmac }       from 'node:crypto'
// --------------------------------------------------------
import { withSignedLength } from './with-signed-length'

const accessKeyId = 'AKIAIOSFODNN7EXAMPLE'
const secretAccessKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

function sigV4(request: { method: string, path: string, query: [string, string][], headers: Record<string, string>, payload: string }, date: string, scope: string): string {
  const encode = (text: string, keepSlash = false) => [...new TextEncoder().encode(text)]
    .map(byte => {
      const char = String.fromCharCode(byte)
      return /[A-Za-z0-9\-._~]/.test(char) || (keepSlash && char === '/') ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
    })
    .join('')
  const names = Object.keys(request.headers).map(name => name.toLowerCase()).sort()
  const headers = Object.fromEntries(Object.entries(request.headers).map(([name, value]) => [name.toLowerCase(), value.trim()]))
  const canonical = [
    request.method,
    encode(request.path, true),
    request.query.map(([name, value]) => [encode(name), encode(value)]).sort(([a], [b]) => (a! < b! ? -1 : a! > b! ? 1 : 0)).map(([name, value]) => `${name}=${value}`).join('&'),
    ...names.map(name => `${name}:${headers[name]}`),
    '',
    names.join(';'),
    request.payload,
  ].join('\n')
  const toSign = ['AWS4-HMAC-SHA256', date, scope, createHash('sha256').update(canonical).digest('hex')].join('\n')
  const key = scope.split('/').reduce<Buffer | string>((key, part) => createHmac('sha256', key).update(part).digest(), `AWS4${secretAccessKey}`)
  return createHmac('sha256', key).update(toSign).digest('hex')
}

function expectedSignature(address: string, method: string, headers: Record<string, string>): string {
  const url = new URL(address)
  const query = [...url.searchParams].filter(([name]) => name !== 'X-Amz-Signature')
  const path = decodeURIComponent(url.pathname)
  const scope = url.searchParams.get('X-Amz-Credential')!.split('/').slice(1).join('/')
  return sigV4({ method, path, query, headers: { host: url.host, ...headers }, payload: 'UNSIGNED-PAYLOAD' }, url.searchParams.get('X-Amz-Date')!, scope)
}

describe('the Signature Version 4 these tests check against', () => {
  test('gives the signatures of AWS\'s examples, headers signed', () => {
    const scope = '20130524/us-east-1/s3/aws4_request'
    const empty = createHash('sha256').update('').digest('hex')
    const get = sigV4({
      method: 'GET', path: '/test.txt', query: [], payload: empty,
      headers: { Host: 'examplebucket.s3.amazonaws.com', Range: 'bytes=0-9', 'x-amz-content-sha256': empty, 'x-amz-date': '20130524T000000Z' },
    }, '20130524T000000Z', scope)
    expect(get).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')

    const body = createHash('sha256').update('Welcome to Amazon S3.').digest('hex')
    const put = sigV4({
      method: 'PUT', path: '/test$file.text', query: [], payload: body,
      headers: {
        Host: 'examplebucket.s3.amazonaws.com', Date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-date': '20130524T000000Z',
        'x-amz-storage-class': 'REDUCED_REDUNDANCY', 'x-amz-content-sha256': body,
      },
    }, '20130524T000000Z', scope)
    expect(put).toBe('98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd')
  })

  test('gives the signature of AWS\'s example of a presigned address', () => {
    const address = 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host'

    expect(expectedSignature(address, 'GET', {})).toBe('aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404')
  })

  test('gives the signatures Bun presigns with, keys of any character', () => {
    const client = new S3Client({ accessKeyId, secretAccessKey, bucket: 'examplebucket', region: 'eu-west-1' })
    for (const key of keys) {
      const address = client.presign(key, { method: 'PUT', expiresIn: 60 })
      expect(new URL(address).searchParams.get('X-Amz-Signature')).toBe(expectedSignature(address, 'PUT', {}))
    }
  })
})

const keys = [
  'test.txt',
  'boards/avatar/0198a3c4-7e21-7c3f-9d0a-6b5f2e1d4c3b',
  'ñandú/año €/日本語.txt',
  'emoji 🦎.png',
  "a b/!'()*~+=&?#$@,;:[].txt",
  'percent%20stays%2Fliteral',
  'a//double/slash/',
]

describe('withSignedLength', () => {
  const clients = {
    'AWS, path style': new S3Client({ accessKeyId, secretAccessKey, bucket: 'examplebucket', region: 'us-east-1' }),
    'AWS, virtual hosted, with a session token': new S3Client({ accessKeyId, secretAccessKey, bucket: 'examplebucket', region: 'eu-west-1', virtualHostedStyle: true, sessionToken: 'FwoG/token+with=signs' }),
    'an endpoint with a port': new S3Client({ accessKeyId, secretAccessKey, bucket: 'bucket', endpoint: 'http://127.0.0.1:59000' }),
    'a session token with the signs encodeURIComponent leaves': new S3Client({ accessKeyId, secretAccessKey, bucket: 'examplebucket', region: 'us-east-1', sessionToken: "token!'()*~with signs" }),
  }

  for (const [name, client] of Object.entries(clients)) {
    test(`signs a PUT of that length and type and no other, host included, on ${name}, keys of any character`, () => {
      for (const key of keys) {
        const signed = withSignedLength(client.presign(key, { method: 'PUT', expiresIn: 300 }), 1234, { 'content-type': 'image/png' }, secretAccessKey)
        const url = new URL(signed)

        expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host')
        expect(url.searchParams.get('X-Amz-Signature')).toBe(expectedSignature(signed, 'PUT', { 'content-length': '1234', 'content-type': 'image/png' }))
        expect(url.searchParams.get('X-Amz-Signature')).not.toBe(expectedSignature(signed, 'PUT', { 'content-length': '1235', 'content-type': 'image/png' }))
        expect(url.searchParams.get('X-Amz-Signature')).not.toBe(expectedSignature(signed, 'PUT', { 'content-length': '1234', 'content-type': 'text/html' }))
        expect(url.searchParams.getAll('X-Amz-Signature')).toHaveLength(1)
      }
    })
  }

  test('keeps where it points, its date, credential, expiry and token, as Bun presigned them', () => {
    const client = clients['AWS, virtual hosted, with a session token']
    const presigned = new URL(client.presign('ñandú/a b.txt', { method: 'PUT', expiresIn: 300 }))
    const signed = new URL(withSignedLength(presigned.href, 10, { 'content-type': 'text/plain' }, secretAccessKey))

    expect(signed.origin + signed.pathname).toBe(presigned.origin + presigned.pathname)
    for (const name of ['X-Amz-Algorithm', 'X-Amz-Credential', 'X-Amz-Date', 'X-Amz-Expires', 'X-Amz-Security-Token']) {
      expect(signed.searchParams.get(name)).toBe(presigned.searchParams.get(name))
    }
  })

  test('signs the query in order of its names, whatever order the address gives it in', () => {
    const address = 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-SignedHeaders=host&X-Amz-Expires=86400&X-Amz-Date=20130524T000000Z&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
    const inOrder = 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host'

    const signed = withSignedLength(address, 21, { 'content-type': 'text/plain' }, secretAccessKey)

    expect(new URL(signed).searchParams.get('X-Amz-Signature')).toBe(expectedSignature(signed, 'PUT', { 'content-length': '21', 'content-type': 'text/plain' }))
    expect(signed).toBe(withSignedLength(inOrder, 21, { 'content-type': 'text/plain' }, secretAccessKey))
  })

  test('signs AWS\'s example address again, its length and type among its headers', () => {
    const address = 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'

    const signed = withSignedLength(address, 21, { 'content-type': 'text/plain' }, secretAccessKey)

    expect(signed).toBe(`https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost&X-Amz-Signature=${expectedSignature(signed, 'PUT', { 'content-length': '21', 'content-type': 'text/plain' })}`)
  })

  test('signs a type with parameters as S3 reads it, its spaces trimmed and run together', () => {
    const address = 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host'

    const signed = withSignedLength(address, 21, { 'content-type': ' text/csv;  charset=utf-8 ' }, secretAccessKey)

    expect(new URL(signed).searchParams.get('X-Amz-Signature')).toBe(expectedSignature(signed, 'PUT', { 'content-length': '21', 'content-type': 'text/csv; charset=utf-8' }))
  })

  test('signs every header it is given, so a PUT without the disposition signed, or with another, is refused', () => {
    const client = clients['an endpoint with a port']
    for (const key of keys) {
      const signed = withSignedLength(client.presign(key, { method: 'PUT', expiresIn: 300 }), 7, { 'content-type': 'text/html', 'content-disposition': 'attachment' }, secretAccessKey)
      const url = new URL(signed)
      const headers = { 'content-length': '7', 'content-type': 'text/html', 'content-disposition': 'attachment' }

      expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-disposition;content-length;content-type;host')
      expect(url.searchParams.get('X-Amz-Signature')).toBe(expectedSignature(signed, 'PUT', headers))
      expect(url.searchParams.get('X-Amz-Signature')).not.toBe(expectedSignature(signed, 'PUT', { ...headers, 'content-disposition': 'inline' }))
      expect(url.searchParams.get('X-Amz-Signature')).not.toBe(expectedSignature(signed, 'PUT', { 'content-length': '7', 'content-type': 'text/html' }))
    }
  })
})
