import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const SignInSessionId = uuidFactory('SignInSessionId')
export type SignInSessionId = Uuid<'SignInSessionId'>
