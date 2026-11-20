import type { Resolved }             from '@newt-js/core'
import { z }                         from 'zod'
// --------------------------------------------------------
import type { ApplicationClientDTO } from '../application-client/application-client.schema'
import type { UserDTO }              from '../user/user.schema'
import { ApplicationClientId }       from './value-objects/application-client-id'
import { OauthAuthorizationId }      from './value-objects/oauth-authorization-id'
import { UserId }                    from './value-objects/user-id'

/** What someone signed in allowed a client: its code is only ever kept hashed, and is exchanged once. */
export const OauthAuthorizationSchema = z.object({
  id: OauthAuthorizationId.schema,
  clientId: ApplicationClientId.schema,
  userId: UserId.schema,
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

/**
 * A request to /authorize, as it came: the host says the application, the cookie of its session says who is signed in,
 * and the query is checked here, never trusted before.
 */
export const OauthAuthorizationAuthorizeSchema = z.object({
  host: z.string(),
  cookies: z.record(z.string(), z.string()),
  query: z.record(z.string(), z.string()),
})

/** Where /authorize sends the browser: back to the client with a code or an error, or to sign in first. */
export type OauthAuthorizationRedirectDTO = { redirectTo: string }

/** What an OpenID client reads to talk to an application: its own issuer, and where each endpoint is. */
export type OauthDiscoveryDTO = {
  issuer: string,
  authorization_endpoint: string,
  token_endpoint: string,
  jwks_uri: string,
  end_session_endpoint: string,
  [metadata: string]: unknown,
}

/** The client and the user an authorization is of, shown whole in its DTO. */
export type OauthAuthorizationReferences = { clientId: ApplicationClientDTO, userId: UserDTO }

export type OauthAuthorizationFields = z.infer<typeof OauthAuthorizationSchema>
export type OauthAuthorizationDTO =
  Resolved<z.infer<typeof OauthAuthorizationPublicSchema>, OauthAuthorizationReferences>
export type OauthAuthorizationAuthorizeDTO = z.input<typeof OauthAuthorizationAuthorizeSchema>
