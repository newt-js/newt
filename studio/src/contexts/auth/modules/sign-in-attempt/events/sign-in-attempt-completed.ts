import { defineEvent }     from '@newt-js/core'
import { z }               from 'zod'
// --------------------------------------------------------
import { ApplicationId }   from '../value-objects/application-id'
import { SignInAttemptId } from '../value-objects/sign-in-attempt-id'
import { SignInStep }      from '../value-objects/sign-in-step'
import { UserId }          from '../value-objects/user-id'

/** Every step done: who signed in, where, and how (`amr`). */
export const SignInAttempt_Completed = defineEvent(
  'signInAttempt.completed',
  z.object({
    id: SignInAttemptId.schema,
    applicationId: ApplicationId.schema,
    userId: UserId.schema,
    amr: z.array(SignInStep.schema),
  }),
)
