import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { isEventStream } from './is-event-stream'

const typed = (type: string) => new Response(null, { headers: { 'content-type': type } })

describe('isEventStream', () => {
  test('an answer of server-sent events, whatever its case or parameters', () => {
    expect(isEventStream(typed('text/event-stream'))).toBe(true)
    expect(isEventStream(typed('Text/Event-Stream; charset=utf-8'))).toBe(true)
  })

  test('not another type, nor one with none', () => {
    expect(isEventStream(typed('application/json'))).toBe(false)
    expect(isEventStream(new Response(null))).toBe(false)
  })
})
