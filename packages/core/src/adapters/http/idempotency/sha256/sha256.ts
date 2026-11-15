export const sha256 = (data: string | Uint8Array) => new Bun.CryptoHasher('sha256').update(data).digest('hex')
