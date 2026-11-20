import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { InvalidRedirectUri } from '../errors/invalid-redirect-uri'
import { RedirectUri }        from './redirect-uri'

test('a redirect uri is kept exactly as given', () => {
  const given = 'https://backoffice.example.com/api/callback?from=auth'
  expect(RedirectUri.from(given) as string).toBe(given)
  expect(RedirectUri.from('http://localhost:3000/callback') as string).toBe('http://localhost:3000/callback')
  expect(RedirectUri.from('http://127.0.0.1:3000/callback') as string).toBe('http://127.0.0.1:3000/callback')
})

test('refuses what is not absolute, has a fragment, or is http away from this machine', () => {
  for (const text of ['', '/callback', 'https://example.com/callback#done', 'https://example.com/#', 'http://example.com/callback', 'javascript:alert(1)', ' https://example.com/cb', 'https://example.com/c\tb', 'https://example.com/cb\n', 'https://user:pw@example.com/cb', 'HTTPS://Example.com/cb']) {
    expect(() => RedirectUri.from(text)).toThrow(InvalidRedirectUri)
  }
})
