import type { Uuid }   from '@newt-js/core'
import { uuidFactory } from '@newt-js/core'

export const OauthSigningKeyId = uuidFactory('OauthSigningKeyId')
export type OauthSigningKeyId = Uuid<'OauthSigningKeyId'>
