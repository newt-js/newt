import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { mountsOf } from './mounts-of'

describe('mountsOf', () => {
  test('no frontend, no mounts', () => {
    expect(mountsOf(undefined, 'public')).toEqual([])
  })

  test('a single frontend is mounted at the root, with the public folder if there is one', () => {
    expect(mountsOf('dist', 'public')).toEqual([{ path: '/', app: 'dist', publicFolder: 'public', prefix: '' }])
    expect(mountsOf('dist', undefined)).toEqual([{ path: '/', app: 'dist', prefix: '' }])
  })

  test('several keep their own, each with its prefix', () => {
    expect(mountsOf([{ path: '/', app: 'web' }, { path: '/backoffice/', app: 'backoffice' }], 'ignored')).toEqual([
      { path: '/', app: 'web', prefix: '' },
      { path: '/backoffice/', app: 'backoffice', prefix: '/backoffice' },
    ])
  })

  test('two at the same prefix, or one whose path does not start with /, are refused', () => {
    expect(() => mountsOf([{ path: '/a', app: 'web' }, { path: '/a/', app: 'backoffice' }], undefined)).toThrow('Two frontends at /a/')
    expect(() => mountsOf([{ path: '', app: 'web' }], undefined)).toThrow('starts with /')
  })
})
