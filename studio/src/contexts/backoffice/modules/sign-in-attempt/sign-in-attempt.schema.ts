import { z }               from 'zod'
// --------------------------------------------------------
import { SignInAttemptId } from './value-objects/sign-in-attempt-id'

/** A sign-in through auth: its secrets are checked when the browser comes back, and the id_token kept to sign out. */
export const SignInAttemptSchema = z.object({
  id: SignInAttemptId.schema,
  stateHash: z.string(),
  nonce: z.string(),
  codeVerifier: z.string(),
  userId: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.string(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What an attempt shows: who signed in, never its secrets nor the id_token. */
export const SignInAttemptPublicSchema = SignInAttemptSchema.omit({
  stateHash: true,
  nonce: true,
  codeVerifier: true,
  idToken: true,
})

export type SignInAttemptFields = z.infer<typeof SignInAttemptSchema>
export type SignInAttemptDTO = z.infer<typeof SignInAttemptPublicSchema>
/** Where the browser goes to sign in, and the state its cookie keeps until it comes back. */
export type SignInAttemptStartedDTO = { redirectTo: string, state: string }
