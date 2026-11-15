import { z }                 from 'zod'
// --------------------------------------------------------
import { defineValueObject } from '../define-value-object'
import { InvalidSearchText } from './invalid-search-text/invalid-search-text'

const MAX_LENGTH = 100

export function searchTextFactory() {
  return defineValueObject(
    z.string().trim().max(MAX_LENGTH).brand<'SearchText'>(),
    () => new InvalidSearchText(MAX_LENGTH),
  )
}

export type SearchText = string & z.$brand<'SearchText'>
export const SearchText = searchTextFactory()
