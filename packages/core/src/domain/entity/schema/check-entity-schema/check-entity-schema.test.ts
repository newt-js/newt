import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { z }                 from 'zod'
// --------------------------------------------------------
import { EntitySchema }      from '../../entity-schema'
import { checkEntitySchema } from './check-entity-schema'

const shape = { id: z.string(), createdAt: z.string(), updatedAt: z.string() }

describe('checkEntitySchema', () => {
  test('gives the fields of a public schema, none without one', () => {
    const schema = z.object({ ...shape, email: z.string(), passwordHash: z.string() })

    expect(checkEntitySchema(class Account {}, schema, z.object({ ...shape, email: z.string() }))).toEqual(['id', 'createdAt', 'updatedAt', 'email'])
    expect(checkEntitySchema(class Note {}, schema)).toBeUndefined()
  })

  test('refuses a schema without its timestamps, one that keeps unnamed fields, or a public schema with fields of its own', () => {
    expect(() => checkEntitySchema(class A {}, z.object({ id: z.string() }) as unknown as EntitySchema)).toThrow("A's schema does not name createdAt")
    expect(() => checkEntitySchema(class B {}, z.looseObject(shape))).toThrow("B's schema keeps fields it does not name")
    expect(() => checkEntitySchema(class C {}, z.object(shape), z.object({ ...shape, secret: z.string() }))).toThrow("C's public schema has 'secret'")
  })

  test('checks each schema once', () => {
    let reads = 0
    const schema = z.object(shape)
    const watched = new Proxy(schema, { get: (target, key, receiver) => {
      if (key === 'shape') {
        reads++
      }
      return Reflect.get(target, key, receiver)
    } })

    checkEntitySchema(class Card {}, watched)
    const once = reads
    checkEntitySchema(class Card {}, watched)

    expect(reads).toBe(once)
  })
})
