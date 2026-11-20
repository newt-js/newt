import type { Resolved }       from '@newt-js/core'
import { z }                   from 'zod'
// --------------------------------------------------------
import type { ApplicationDTO } from '../application/application.schema'
import type { UserDTO }        from '../user/user.schema'
import { ApplicationId }       from './value-objects/application-id'
import { SignInAttemptId }     from './value-objects/sign-in-attempt-id'
import { SignInSessionId }     from './value-objects/sign-in-session-id'
import { SignInStep }          from './value-objects/sign-in-step'
import { UserId }              from './value-objects/user-id'

/** Who signed in to an application, and how. Its token is only ever kept hashed. */
export const SignInSessionSchema = z.object({
  id: SignInSessionId.schema,
  applicationId: ApplicationId.schema,
  userId: UserId.schema,
  attemptId: SignInAttemptId.schema,
  amr: z.array(SignInStep.schema),
  tokenHash: z.string(),
  expiresAt: z.string(),
  endedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a session shows: never its token's hash, nor the attempt it only keeps to open once. */
export const SignInSessionPublicSchema = SignInSessionSchema.omit({
  tokenHash: true,
  attemptId: true,
})

/** Who is calling, by the token of its cookie, and to which application it signed in. */
export const SignInSessionActorOfSchema = z.object({
  token: z.string().max(100),
  applicationSlug: z.string(),
})

/** The application and the user a session is of, shown whole in its DTO. */
export type SignInSessionReferences = { applicationId: ApplicationDTO, userId: UserDTO }

export type SignInSessionFields = z.infer<typeof SignInSessionSchema>
export type SignInSessionDTO =
  Resolved<z.infer<typeof SignInSessionPublicSchema>, SignInSessionReferences>
export type SignInSessionActorOfDTO = z.input<typeof SignInSessionActorOfSchema>
/** A session just opened, with the token for its cookie: the only time the token is seen. */
export type SignInSessionOpenedDTO = { session: SignInSessionDTO, token: string }
