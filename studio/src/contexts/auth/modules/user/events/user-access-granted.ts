import { defineEvent }             from '@newt-js/core'
// --------------------------------------------------------
import { UserAccessGrantedSchema } from '../user.schema'

export const User_AccessGranted = defineEvent('user.accessGranted', UserAccessGrantedSchema)
