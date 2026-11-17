import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_CLUSTER } from './cluster-of'
import { clusterOf }       from './cluster-of'

test('the cluster given', () => {
  expect(clusterOf('valkey')).toBe('valkey')
  expect(clusterOf('memory')).toBe('memory')
})

test('memory when none is given', () => {
  expect(clusterOf(undefined)).toBe(DEFAULT_CLUSTER)
  expect(DEFAULT_CLUSTER).toBe('memory')
})

test('refuses one there is not, saying which there are', () => {
  expect(() => clusterOf('redis')).toThrow("'redis' is not a cluster: memory or valkey")
})
