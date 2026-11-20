import type { Resolved }       from '@newt-js/core'
import { z }                   from 'zod'
// --------------------------------------------------------
import type { ApplicationDTO } from '../application/application.schema'
import type { UserDTO }        from '../user/user.schema'
import { ApplicationId }       from './value-objects/application-id'
import { SignInAttemptId }     from './value-objects/sign-in-attempt-id'
import { SignInStep }          from './value-objects/sign-in-step'
import { UserId }              from './value-objects/user-id'

/** Long enough for a pass phrase: as userCredential takes it. */
const LONGEST_ANSWER = 256

/** One try to sign in to an application: the steps its policy asks for, done one by one. */
export const SignInAttemptSchema = z.object({
  id: SignInAttemptId.schema,
  applicationId: ApplicationId.schema,
  userId: UserId.schema.nullable(),
  pendingSteps: z.array(SignInStep.schema),
  doneSteps: z.array(SignInStep.schema),
  failedTries: z.number().int().min(0),
  expiresAt: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Who signs in, and where: the same answer whether the email is known or not. */
export const SignInAttemptStartSchema = z.object({
  applicationId: ApplicationId.schema,
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
})

/** The answer to the attempt's next step: today, the password. */
export const SignInAttemptAnswerSchema = z.object({
  attemptId: SignInAttemptId.schema,
  step: SignInStep.schema,
  answer: z.string().max(LONGEST_ANSWER),
})

/** What the one signing in sees of the attempt: never whether its user exists. */
export const SignInAttemptProgressSchema = z.object({
  id: SignInAttemptId.schema,
  nextStep: SignInStep.schema.nullable(),
  completed: z.boolean(),
  expiresAt: z.string(),
})

/** The application and the user an attempt is of, shown whole: no user when the email was unknown. */
export type SignInAttemptReferences = { applicationId: ApplicationDTO, userId: UserDTO }

export type SignInAttemptDTO = Resolved<z.infer<typeof SignInAttemptSchema>, SignInAttemptReferences>
export type SignInAttemptStartDTO = z.input<typeof SignInAttemptStartSchema>
export type SignInAttemptAnswerDTO = z.input<typeof SignInAttemptAnswerSchema>
export type SignInAttemptProgressDTO = z.infer<typeof SignInAttemptProgressSchema>
