import { z }                 from 'zod'
// --------------------------------------------------------
import { OauthSigningKeyId } from './value-objects/oauth-signing-key-id'

/** A public key as a JWK: what anyone needs to check a signature. */
const PublicJwkSchema = z.object({
  kty: z.literal('RSA'),
  n: z.string(),
  e: z.string(),
  alg: z.literal('RS256'),
  use: z.literal('sig'),
  kid: z.string(),
})

/** A key that signs tokens; its id is the `kid` in their header, so keys can rotate. Its private half is kept encrypted. */
export const OauthSigningKeySchema = z.object({
  id: OauthSigningKeyId.schema,
  publicJwk: PublicJwkSchema,
  privateKeyEncrypted: z.string(),
  retiredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a key shows: never its private half, not even encrypted. */
export const OauthSigningKeyPublicSchema = OauthSigningKeySchema.omit({
  privateKeyEncrypted: true,
})

/** The claims of a token to sign, and its type: `JWT` for an id_token, `at+jwt` for an access token (RFC 9068). */
export const OauthSigningKeySignSchema = z.object({
  claims: z.record(z.string(), z.unknown()),
  type: z.enum(['JWT', 'at+jwt']),
})

/** A token this auth signed, the issuer it must be of, and its type: an id_token (`JWT`) or an access token (`at+jwt`). */
export const OauthSigningKeyVerifySchema = z.object({
  token: z.string().max(10_000),
  issuer: z.string(),
  type: OauthSigningKeySignSchema.shape.type,
})

export type OauthSigningKeyFields = z.infer<typeof OauthSigningKeySchema>
export type OauthSigningKeyDTO = z.infer<typeof OauthSigningKeyPublicSchema>
export type OauthSigningKeySignDTO = z.input<typeof OauthSigningKeySignSchema>
export type OauthSigningKeyVerifyDTO = z.input<typeof OauthSigningKeyVerifySchema>
export type PublicJwk = z.infer<typeof PublicJwkSchema>
/** The public keys, as `jwks_uri` gives them. */
export type Jwks = { keys: PublicJwk[] }
