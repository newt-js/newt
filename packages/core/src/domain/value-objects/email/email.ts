import { z }                 from 'zod'
// --------------------------------------------------------
import { defineValueObject } from '../define-value-object'
import { InvalidEmail }      from './invalid-email/invalid-email'

const MAX_LENGTH = 254

export function emailFactory() {
  return defineValueObject(
    z.string().trim().toLowerCase().pipe(z.email().max(MAX_LENGTH)).brand<'Email'>(),
    value => new InvalidEmail(value),
  )
}

export type Email = string & z.$brand<'Email'>
export const Email = emailFactory()
