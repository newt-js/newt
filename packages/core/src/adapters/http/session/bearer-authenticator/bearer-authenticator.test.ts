import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { Actor }               from '../../../../domain/actor/actor'
import { withParams }          from '../../request/with-params/with-params'
import { bearerAuthenticator } from './bearer-authenticator'

const requestWith = (authorization?: string) => withParams(new Request('http://app.test/', { headers: authorization === undefined ? {} : { authorization } }), {})

function knowing(token: string, actor: Actor) {
  const asked: string[] = []
  const authenticate = bearerAuthenticator(async given => {
    asked.push(given)
    return given === token ? actor : null
  })
  return { as: (authorization?: string) => authenticate(requestWith(authorization)), asked }
}

describe('bearerAuthenticator', () => {
  test('is whose the token is, whatever the case of Bearer and the spaces after it', async () => {
    const { as } = knowing('t0ken', { userId: 'ana' })

    for (const authorization of ['Bearer t0ken', 'bearer t0ken', 'BEARER \tt0ken']) {
      expect(await as(authorization)).toEqual({ userId: 'ana' })
    }
  })

  test('is nobody for a token verify does not know', async () => {
    const { as, asked } = knowing('t0ken', { userId: 'ana' })

    expect(await as('Bearer other')).toBeNull()
    expect(asked).toEqual(['other'])
  })

  test('is nobody, and asks verify nothing, without a bearer token alone', async () => {
    const { as, asked } = knowing('t0ken', { userId: 'ana' })

    for (const authorization of [undefined, '', 'Bearer', 'Bearer ', 'Basic dXNlcjpwYXNz', 'Bearer t0ken extra', 'Bearert0ken', 'Token t0ken']) {
      expect(await as(authorization)).toBeNull()
    }
    expect(asked).toEqual([])
  })

  test('a verify that throws throws: it is not taken for nobody', async () => {
    const authenticate = bearerAuthenticator(async () => {
      throw new Error('the token store is down')
    })

    await expect(authenticate(requestWith('Bearer t0ken'))).rejects.toThrow('the token store is down')
  })
})
