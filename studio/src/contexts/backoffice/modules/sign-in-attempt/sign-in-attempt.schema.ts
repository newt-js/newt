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

/** What auth sends back with the browser, and the browser's cookies, among which the one of its attempt. */
export const SignInAttemptFinishSchema = z.object({
  query: z.record(z.string(), z.string()),
  cookies: z.record(z.string(), z.string()),
})

export type SignInAttemptFields = z.infer<typeof SignInAttemptSchema>
export type SignInAttemptDTO = z.infer<typeof SignInAttemptPublicSchema>
/** Where the browser goes to sign in, and the state its cookie keeps until it comes back. */
export type SignInAttemptStartedDTO = { redirectTo: string, state: string }
export type SignInAttemptFinishDTO = z.input<typeof SignInAttemptFinishSchema>
/** The attempt finished, and the cookie that tied it to the browser: spent now, the route clears it. */
export type SignInAttemptFinishedDTO = { attempt: SignInAttemptDTO, spentCookie: string }
