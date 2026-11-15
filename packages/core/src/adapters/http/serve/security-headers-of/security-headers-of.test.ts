import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { SECURITY_HEADERS }  from '../security-headers'
import { securityHeadersOf } from './security-headers-of'

describe('securityHeadersOf', () => {
  test('newt\'s unless told', () => {
    expect(securityHeadersOf(undefined, undefined)).toEqual(SECURITY_HEADERS)
  })

  test('each one given replaces newt\'s, and null leaves it out', () => {
    expect(securityHeadersOf({ 'Referrer-Policy': 'no-referrer', 'x-frame-options': null, 'permissions-policy': 'camera=()' }, undefined)).toEqual({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=()',
    })
  })

  test('false sends none of them', () => {
    expect(securityHeadersOf(false, undefined)).toEqual({})
  })

  test('HSTS only when asked: a year unless told', () => {
    expect(securityHeadersOf(false, true)).toEqual({ 'strict-transport-security': 'max-age=31536000' })
    expect(securityHeadersOf(false, { maxAgeSeconds: 600, includeSubDomains: true, preload: true })['strict-transport-security']).toBe('max-age=600; includeSubDomains; preload')
  })
})
