import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { orNull }   from './or-null'

describe('orNull', () => {
  test('what was read is given as it is', async () => {
    expect(await orNull(Promise.resolve('read'))).toBe('read')
  })

  test('a file that is not there is null', async () => {
    expect(await orNull(Promise.reject(Object.assign(new Error('gone'), { code: 'NoSuchKey' })))).toBeNull()
  })

  test('any other error is thrown on', async () => {
    const denied = Object.assign(new Error('denied'), { code: 'AccessDenied' })

    await expect(orNull(Promise.reject(denied))).rejects.toBe(denied)
  })
})
