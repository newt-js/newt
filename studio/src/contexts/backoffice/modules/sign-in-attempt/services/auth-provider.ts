/** What backoffice needs of auth's OpenID configuration. */
type ProviderMetadata = {
  issuer: string,
  authorization_endpoint: string,
  token_endpoint: string,
  jwks_uri: string,
  end_session_endpoint: string,
}

/** A setting of `.env`, which backoffice cannot sign anyone in without. */
function setting(name: string): string {
  const value = Bun.env[name]
  if (!value) {
    throw new Error(`${name} is not set in .env`)
  }
  return value
}

/** Who backoffice is to auth, and where auth is: read on each use, so `.env` can change under the tests. */
export function providerSettings(): { issuer: string, clientId: string, clientSecret: string, publicUrl: string } {
  return {
    issuer: setting('BACKOFFICE_AUTH_ISSUER'),
    clientId: setting('BACKOFFICE_AUTH_CLIENT_ID'),
    clientSecret: setting('BACKOFFICE_AUTH_CLIENT_SECRET'),
    publicUrl: Bun.env.PUBLIC_URL ?? 'http://localhost:3000',
  }
}

const discovered = new Map<string, Promise<ProviderMetadata>>()

/** auth's OpenID configuration for backoffice's application, asked once per issuer. */
export function metadataOf(issuer: string): Promise<ProviderMetadata> {
  let metadata = discovered.get(issuer)
  if (!metadata) {
    metadata = discover(issuer)
    // A failure is not kept: the next sign-in asks again.
    metadata.catch(() => discovered.delete(issuer))
    discovered.set(issuer, metadata)
  }
  return metadata
}

async function discover(issuer: string): Promise<ProviderMetadata> {
  const response = await fetch(`${issuer}/.well-known/openid-configuration`)
  if (!response.ok) {
    throw new Error(`auth answered ${response.status} to its OpenID configuration`)
  }
  const metadata = await response.json() as ProviderMetadata
  // OpenID Connect Discovery §4.3: the configuration must be of the issuer asked.
  if (metadata.issuer !== issuer) {
    throw new Error('auth gave the OpenID configuration of another issuer')
  }
  return metadata
}

/** A random value of 32 bytes, as base64url: for state, nonce and the PKCE verifier. */
export function randomValue(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
}

/** SHA-256 as base64url: PKCE's S256 challenge, and how state is kept. */
export function sha256(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('base64url')
}
