import { encoded } from '../encoded/encoded'
import { hmac }    from '../hmac/hmac'
import { sha256 }  from '../sha256/sha256'

export function withSignedLength(address: string, length: number, headers: Record<string, string>, secretAccessKey: string): string {
  const url = new URL(address)
  const signed = Object.entries({ ...headers, 'content-length': String(length), host: url.host })
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const names = signed.map(([name]) => name).join(';')
  url.searchParams.delete('X-Amz-Signature')
  url.searchParams.set('X-Amz-SignedHeaders', names)

  const query = [...url.searchParams]
    .map(([name, value]) => `${encoded(name)}=${encoded(value)}`)
    .sort()
    .join('&')
  const request = ['PUT', url.pathname, query, ...signed.map(([name, value]) => `${name}:${value}`), '', names, 'UNSIGNED-PAYLOAD'].join('\n')

  const date = url.searchParams.get('X-Amz-Date')!
  const scope = url.searchParams.get('X-Amz-Credential')!.split('/').slice(1)
  const key = scope.reduce<string | Uint8Array>((signed, part) => hmac(signed, part), `AWS4${secretAccessKey}`)
  const signature = new Bun.CryptoHasher('sha256', key)
    .update(['AWS4-HMAC-SHA256', date, scope.join('/'), sha256(request)].join('\n'))
    .digest('hex')

  return `${url.origin}${url.pathname}?${query}&X-Amz-Signature=${signature}`
}
