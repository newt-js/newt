import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const SignInAttemptId = uuidFactory('SignInAttemptId')
export type SignInAttemptId = Uuid<'SignInAttemptId'>
