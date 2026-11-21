import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const ApplicationId = uuidFactory('ApplicationId')
export type ApplicationId = Uuid<'ApplicationId'>
