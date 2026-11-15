import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { compareRunAfter } from './compare-run-after'

describe('compareRunAfter', () => {
  test('puts the row due first before the one due later', () => {
    expect(compareRunAfter({ id: 'b', run_after: '2026-01-01' }, { id: 'a', run_after: '2026-01-02' })).toBe(-1)
    expect(compareRunAfter({ id: 'a', run_after: '2026-01-02' }, { id: 'b', run_after: '2026-01-01' })).toBe(1)
  })

  // -----

  test('breaks a tie in run_after by the id', () => {
    expect(compareRunAfter({ id: 'a', run_after: '2026-01-01' }, { id: 'b', run_after: '2026-01-01' })).toBe(-1)
    expect(compareRunAfter({ id: 'b', run_after: '2026-01-01' }, { id: 'a', run_after: '2026-01-01' })).toBe(1)
  })

  // -----

  test('sorts claimed rows the way the claim query orders them', () => {
    const rows = [{ id: 'c', run_after: '2026-01-02' }, { id: 'b', run_after: '2026-01-01' }, { id: 'a', run_after: '2026-01-01' }]
    expect(rows.sort(compareRunAfter).map(row => row.id)).toEqual(['a', 'b', 'c'])
  })
})
