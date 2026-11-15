import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { clientIp }     from '../client-ip/client-ip'
import { noteClientIp } from './note-client-ip'

const ipOf = (trustProxy: number, forwarded?: string) => {
  const request = new Request('http://shop.test/', { headers: forwarded ? { 'x-forwarded-for': forwarded } : {} })
  noteClientIp(request, '127.0.0.1', trustProxy)
  return clientIp(request)
}

describe('noteClientIp', () => {
  test('the socket\'s address, whatever X-Forwarded-For says, unless a proxy is trusted', () => {
    expect([ipOf(0), ipOf(0, '203.0.113.9')]).toEqual(['127.0.0.1', '127.0.0.1'])
  })

  test('behind trusted proxies, the one the first of them saw, never what the client wrote before it', () => {
    expect(ipOf(1, '203.0.113.9')).toBe('203.0.113.9')
    expect(ipOf(1, '6.6.6.6, 203.0.113.9')).toBe('203.0.113.9')
    expect(ipOf(2, '6.6.6.6, 203.0.113.9, 10.0.0.2')).toBe('203.0.113.9')
    expect(ipOf(2, '203.0.113.9')).toBe('203.0.113.9')
  })

  test('behind a proxy that said nothing, the socket\'s', () => {
    expect(ipOf(1)).toBe('127.0.0.1')
  })
})
