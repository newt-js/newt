import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { isJson }   from './is-json'

describe('isJson', () => {
  test('application/json, with its charset or in any case, and the types built on it', () => {
    expect(['application/json', 'Application/JSON; charset=utf-8', 'application/merge-patch+json'].map(isJson)).toEqual([true, true, true])
  })

  test('nothing else, nor no type at all', () => {
    expect(['text/plain', 'application/x-www-form-urlencoded', 'text/json', null].map(isJson)).toEqual([false, false, false, false])
  })
})
