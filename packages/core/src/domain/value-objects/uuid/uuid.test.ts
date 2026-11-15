import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { Uuid }        from './uuid'
import { uuidFactory } from './uuid'

describe('Uuid', () => {
  test('is a string at runtime, but one of its kind only to the compiler', () => {
    const board = 'id' as Uuid<'BoardId'>
    // @ts-expect-error a CardId is no BoardId
    const card: Uuid<'CardId'> = board
    // @ts-expect-error a plain string is no BoardId
    const plain: Uuid<'BoardId'> = 'id'

    expect([card, plain] as string[]).toEqual(['id', 'id'])
  })
})

const BoardId = uuidFactory('BoardId')
type BoardId = Uuid<'BoardId'>

describe('uuidFactory', () => {
  test('takes a UUID v7, the id an entity is given', () => {
    const id = Bun.randomUUIDv7()
    expect(BoardId.from(id)).toBe(id as BoardId)
    expect(BoardId.schema.parse(id)).toBe(id as BoardId)
  })

  test('refuses anything else with a validation error that names its type', () => {
    for (const value of ['', 'board-1', crypto.randomUUID()]) {
      expect(() => BoardId.from(value)).toThrow(expect.objectContaining({ code: 'invalid_uuid', kind: 'validation', params: { type: 'BoardId' } }))
    }
  })
})

describe('uuidFactory, generate', () => {
  test('makes a new id of its kind', () => {
    const id: BoardId = BoardId.generate()

    expect(BoardId.tryFrom(id)).toBe(id)
    expect(BoardId.generate()).not.toBe(id)
  })
})
