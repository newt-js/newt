import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { CONTENT_SECURITY_POLICY } from '../content-security-policy'
import { policyOf }                from './policy-of'

const hash = "'sha256-abc'"
const directives = (policy: string) => Object.fromEntries(policy.split('; ').map(directive => [directive.split(' ')[0]!, directive.split(' ').slice(1)]))

describe('policyOf', () => {
  test('is newt\'s unless told, every directive in it', () => {
    expect(directives(policyOf(undefined, []))).toEqual(Object.fromEntries(Object.entries(CONTENT_SECURITY_POLICY).map(([name, sources]) => [name, [...sources]])))
  })

  test('lets the page\'s inline scripts run by their hashes, in script-src only', () => {
    const policy = directives(policyOf(undefined, [hash]))

    expect([policy['script-src'], policy['default-src']]).toEqual([["'self'", hash], ["'self'"]])
  })

  test('each directive given replaces newt\'s, a new one is added, and null leaves one out', () => {
    const policy = directives(policyOf({ 'img-src': ["'self'", 'https://cdn.test'], 'worker-src': ["'self'"], 'font-src': null }, []))

    expect([policy['img-src'], policy['worker-src'], policy['font-src'], policy['frame-ancestors']]).toEqual([["'self'", 'https://cdn.test'], ["'self'"], undefined, ["'none'"]])
  })

  test('a script-src of its own still gets the hashes; one left out takes none', () => {
    expect(directives(policyOf({ 'script-src': ['https://cdn.test'] }, [hash]))['script-src']).toEqual(['https://cdn.test', hash])
    expect(policyOf({ 'script-src': null }, [hash])).not.toContain('sha256')
  })

  test('false is no policy, but that no page is framed', () => {
    expect(policyOf(false, [hash])).toBe("frame-ancestors 'none'")
  })
})
