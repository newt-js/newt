import { z }                    from 'zod'
// --------------------------------------------------------
import { OauthAuthorizationId } from './value-objects/oauth-authorization-id'

/** What someone signed in allowed a client: its code is only ever kept hashed, and is exchanged once. */
export const OauthAuthorizationSchema = z.object({
  id: OauthAuthorizationId.schema,
  clientId: z.string(),
  userId: z.string(),
  redirectUri: z.string(),
  scopes: z.array(z.string()),
  codeChallenge: z.string(),
  nonce: z.string().nullable(),
  amr: z.array(z.string()),
  authTime: z.string(),
  codeHash: z.string(),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What an authorization shows: never its code's hash. */
export const OauthAuthorizationPublicSchema = OauthAuthorizationSchema.omit({ codeHash: true })

/** What an OpenID client reads to talk to an application: its own issuer, and where each endpoint is. */
export type OauthDiscoveryDTO = {
  issuer: string,
  authorization_endpoint: string,
  token_endpoint: string,
  jwks_uri: string,
  end_session_endpoint: string,
  [metadata: string]: unknown,
}

export type OauthAuthorizationFields = z.infer<typeof OauthAuthorizationSchema>
export type OauthAuthorizationDTO = z.infer<typeof OauthAuthorizationPublicSchema>
