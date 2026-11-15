import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { tickOf }   from './tick-of'

describe('tickOf', () => {
  test('makes the event of a schedule, named after it, told by its clock', () => {
    const Nightly = tickOf('report.nightly', { now: () => new Date('2031-01-02T03:00:00.000Z') })

    expect(Nightly.eventName).toBe('report.nightly')
    expect(new Nightly({ dueAt: '2031-01-02T03:00:00.000Z' })).toMatchObject({ name: 'report.nightly', occurredAt: '2031-01-02T03:00:00.000Z', payload: { dueAt: '2031-01-02T03:00:00.000Z' } })
  })
})
