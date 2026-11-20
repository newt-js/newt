import type { JWK } from 'jose'

/** The secret that encrypts the private keys, from `.env`: 32 random bytes in base64url. */
async function encryptionKey(): Promise<CryptoKey> {
  const secret = Buffer.from(Bun.env.AUTH_SIGNING_KEYS_SECRET ?? '', 'base64url')
  if (secret.length !== 32) {
    // Made with: bun -e "console.log(crypto.getRandomValues(Buffer.alloc(32)).toString('base64url'))"
    throw new Error('AUTH_SIGNING_KEYS_SECRET must be 32 random bytes in base64url')
  }
  return crypto.subtle.importKey('raw', secret, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** A private key as kept: AES-GCM with the secret of `.env`, its iv first. A leaked table signs nothing. */
export async function encryptPrivateKey(privateJwk: object): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(privateJwk))
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), plain)
  return `${Buffer.from(iv).toString('base64url')}.${Buffer.from(sealed).toString('base64url')}`
}

export async function decryptPrivateKey(encrypted: string): Promise<JWK> {
  const [iv = '', sealed = ''] = encrypted.split('.')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') },
    await encryptionKey(),
    Buffer.from(sealed, 'base64url'),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as JWK
}
