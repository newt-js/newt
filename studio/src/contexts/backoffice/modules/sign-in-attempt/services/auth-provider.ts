import { createRemoteJWKSet } from 'jose'
import { jwtVerify }          from 'jose'
// --------------------------------------------------------

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

/** How long auth has to answer backoffice: a hung request never holds a sign-in for long. */
const TIMEOUT_MS = 10_000

/**
 * Who backoffice is to auth, where auth is, and where backoffice answers from outside: its own host if it has one,
 * as its routes do, or else the backend's PUBLIC_URL. Read on each use, so `.env` can change under the tests.
 */
export function providerSettings(): { issuer: string, clientId: string, clientSecret: string, publicUrl: string } {
  const backend = setting('PUBLIC_URL')
  const host = Bun.env.BACKOFFICE_HOST
  return {
    issuer: setting('BACKOFFICE_AUTH_ISSUER'),
    clientId: setting('BACKOFFICE_AUTH_CLIENT_ID'),
    clientSecret: setting('BACKOFFICE_AUTH_CLIENT_SECRET'),
    publicUrl: host ? `${new URL(backend).protocol}//${host}` : backend,
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
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`auth answered ${response.status} to its OpenID configuration`)
  }
  const metadata = await response.json() as ProviderMetadata
  // OpenID Connect Discovery §4.3: the configuration must be of the issuer asked.
  if (metadata.issuer !== issuer) {
    throw new Error('auth gave the OpenID configuration of another issuer')
  }
  const endpoints = [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri, metadata.end_session_endpoint]
  if (!endpoints.every(each => typeof each === 'string')) {
    throw new Error('auth gave an OpenID configuration without the endpoints backoffice uses')
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

/** The id_token auth gives for a code, proving backoffice with its secret (client_secret_basic); null if it refuses. */
export async function redeemCode(
  { code, codeVerifier, redirectUri }: { code: string, codeVerifier: string, redirectUri: string },
): Promise<string | null> {
  const { issuer, clientId, clientSecret } = providerSettings()
  const { token_endpoint } = await metadataOf(issuer)
  // Each half is form-urlencoded first (RFC 6749 §2.3.1).
  const credentials = Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64')
  const response = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'authorization': `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: codeVerifier }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    return null
  }
  const { id_token } = await response.json() as { id_token?: unknown }
  return typeof id_token === 'string' ? id_token : null
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

/**
 * Who an id_token says signed in, once checked as OpenID Connect Core §3.1.3.7 says: signed by auth's keys, by
 * backoffice's issuer, for backoffice's client, alive, and with the nonce of this attempt. Null if anything fails.
 */
export async function subjectOf(
  { idToken, nonce, now }: { idToken: string, nonce: string, now: Date },
): Promise<string | null> {
  const { issuer, clientId } = providerSettings()
  const { jwks_uri } = await metadataOf(issuer)
  const keys = keySets.get(jwks_uri) ?? createRemoteJWKSet(new URL(jwks_uri), { timeoutDuration: TIMEOUT_MS })
  keySets.set(jwks_uri, keys)
  try {
    const { payload } = await jwtVerify(idToken, keys, {
      issuer,
      audience: clientId,
      algorithms: ['RS256'],
      // An id_token, never an access token (at+jwt).
      typ: 'JWT',
      requiredClaims: ['exp', 'iat', 'sub'],
      currentDate: now,
    })
    // With more than one audience, the one it was given to must be backoffice (§3.1.3.7, rule 4).
    const givenToBackoffice = !Array.isArray(payload.aud) || payload.azp === clientId
    return payload.nonce === nonce && givenToBackoffice && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
