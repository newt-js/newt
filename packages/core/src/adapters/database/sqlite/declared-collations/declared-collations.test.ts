import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { declaredCollations } from './declared-collations'

describe('declaredCollations', () => {
  test('finds the collation of each column, past sizes, checks and quoted names', () => {
    const sql = `CREATE TABLE "my (table)" (
      id TEXT PRIMARY KEY,
      title VARCHAR(40) COLLATE NOCASE,
      note TEXT CHECK (note <> 'a, b') COLLATE rtrim,
      "full, name" TEXT COLLATE "NOCASE",
      [other] TEXT COLLATE BINARY
    )`

    expect(declaredCollations(sql)).toEqual([
      { column: 'title', collation: 'NOCASE' },
      { column: 'note', collation: 'rtrim' },
      { column: 'full, name', collation: 'NOCASE' },
      { column: 'other', collation: 'BINARY' },
    ])
  })

  test('leaves out a collation inside an expression, a default or a comment, and the table constraints', () => {
    const sql = `CREATE TABLE t (
      a TEXT DEFAULT 'COLLATE NOCASE' CHECK (a = 'x' COLLATE NOCASE), -- COLLATE NOCASE
      b TEXT /* COLLATE RTRIM */,
      UNIQUE (b COLLATE NOCASE)
    ) STRICT`

    expect(declaredCollations(sql)).toEqual([])
  })
})
