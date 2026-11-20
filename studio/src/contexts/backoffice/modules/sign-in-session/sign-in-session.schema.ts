import { z }               from 'zod'
// --------------------------------------------------------
import { SignInAttemptId } from './value-objects/sign-in-attempt-id'
import { SignInSessionId } from './value-objects/sign-in-session-id'

/** Who signed in to backoffice, by the user auth told: its token is only ever kept hashed. */
export const SignInSessionSchema = z.object({
  id: SignInSessionId.schema,
  attemptId: SignInAttemptId.schema,
  userId: z.string(),
  tokenHash: z.string(),
  expiresAt: z.string(),
  endedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a session shows: never its token's hash, nor the attempt it only keeps to open once and to sign out. */
export const SignInSessionPublicSchema = SignInSessionSchema.omit({
  tokenHash: true,
  attemptId: true,
})

/** The finished attempt a session is opened from. */
export const SignInSessionOpenSchema = z.object({
  attemptId: SignInAttemptId.schema,
})

export type SignInSessionFields = z.infer<typeof SignInSessionSchema>
export type SignInSessionDTO = z.infer<typeof SignInSessionPublicSchema>
export type SignInSessionOpenDTO = z.input<typeof SignInSessionOpenSchema>
/** A session just opened, with the token for its cookie: the only time the token is seen. */
export type SignInSessionOpenedDTO = { session: SignInSessionDTO, token: string }
