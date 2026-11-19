import { defineEvent } from '@newt-js/core'
// --------------------------------------------------------
import { UserSchema }  from '../user.schema'

export const User_Created = defineEvent('user.created', UserSchema)
