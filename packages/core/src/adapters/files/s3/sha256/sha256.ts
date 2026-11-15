export const sha256 = (text: string) => new Bun.CryptoHasher('sha256').update(text).digest('hex')
