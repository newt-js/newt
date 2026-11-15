import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { jobsChannel } from './jobs-channel'

describe('jobsChannel', () => {
  test('is one channel for each context, where its new jobs are told', () => {
    expect(jobsChannel('shop')).toBe('newt:jobs:shop')
    expect(jobsChannel('shop')).not.toBe(jobsChannel('billing'))
  })
})
