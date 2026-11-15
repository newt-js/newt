import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { currentActor } from '../../../../domain/actor/current-actor/current-actor'
import { NotSignedIn }  from '../../errors/not-signed-in/not-signed-in'
import { withParams }   from '../../request/with-params/with-params'
import { signedIn }     from './signed-in'

const me = () => Response.json(currentActor())
const request = (user?: string) => withParams(new Request('http://shop.test/', { headers: user ? { 'x-user': user } : {} }), {})
const byHeader = async (each: Request) => (each.headers.get('x-user') ? { userId: each.headers.get('x-user')! } : null)

describe('signedIn', () => {
  test('runs the route as whoever the authenticator says sent it', async () => {
    expect(await (await signedIn(me, () => byHeader)(request('ana'))).json()).toEqual({ userId: 'ana' })
  })

  test('NotSignedIn when nobody did, or while there is no authenticator', async () => {
    await expect(signedIn(me, () => byHeader)(request())).rejects.toThrow(NotSignedIn)
    await expect(signedIn(me, () => null)(request('ana'))).rejects.toThrow(NotSignedIn)
  })
})
