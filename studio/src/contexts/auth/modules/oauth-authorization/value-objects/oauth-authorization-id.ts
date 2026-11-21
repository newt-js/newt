import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const OauthAuthorizationId = uuidFactory('OauthAuthorizationId')
export type OauthAuthorizationId = Uuid<'OauthAuthorizationId'>
