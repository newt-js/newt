import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const ApplicationClientId = uuidFactory('ApplicationClientId')
export type ApplicationClientId = Uuid<'ApplicationClientId'>
