import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { quietCluster } from './quiet-cluster'

describe('quietCluster', () => {
  test('counts nothing and keeps nothing', async () => {
    const cluster = quietCluster()

    expect(await cluster.count('k')).toBe(0)
    expect(await cluster.increment('k', 1, 1_000)).toBe(1)
    await expect(cluster.forget('k')).resolves.toBeUndefined()
  })

  // -----

  test('tells a published channel to the listeners subscribed to it, until they leave', async () => {
    const cluster = quietCluster()
    const heard: string[] = []
    const leave = cluster.subscribe('a', () => heard.push('a'))
    cluster.subscribe('b', () => heard.push('b'))

    await cluster.publish('a')
    leave()
    await cluster.publish('a')

    expect(heard).toEqual(['a'])
  })
})
