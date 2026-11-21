import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const UserId = uuidFactory('UserId')
export type UserId = Uuid<'UserId'>
