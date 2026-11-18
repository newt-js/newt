import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { it }       from 'bun:test'
// --------------------------------------------------------
import { allowed }  from './allowed'

describe('allowed', () => {
  it('lets domain import nothing outside it', () => {
    expect(allowed('domain', 'application', false)).toBe(false)
    expect(allowed('domain', 'adapters/http', false)).toBe(false)
  })

  it('lets application import only domain', () => {
    expect(allowed('application', 'domain', false)).toBe(true)
    expect(allowed('application', 'adapters/http', false)).toBe(false)
  })

  it('lets an adapter import domain and application, but not another adapter', () => {
    expect(allowed('adapters/http', 'domain', false)).toBe(true)
    expect(allowed('adapters/http', 'application', false)).toBe(true)
    expect(allowed('adapters/http', 'adapters/files', false)).toBe(false)
  })

  it('lets the sql databases import the shared sql adapter', () => {
    expect(allowed('adapters/database/postgres', 'adapters/database/sql', false)).toBe(true)
    expect(allowed('adapters/database/mysql', 'adapters/database/sql', false)).toBe(true)
    expect(allowed('adapters/database/sqlite', 'adapters/database/sql', false)).toBe(true)
    expect(allowed('adapters/database/memory', 'adapters/database/sql', false)).toBe(false)
  })

  it("lets an adapter of a port open that port's memory adapter, and no other port's", () => {
    expect(allowed('adapters/database/postgres', 'adapters/database/memory', false)).toBe(true)
    expect(allowed('adapters/files/s3', 'adapters/files/memory', false)).toBe(true)
    expect(allowed('adapters/files/s3', 'adapters/database/memory', false)).toBe(false)
  })

  it('lets tests of domain and application import any adapter', () => {
    expect(allowed('domain', 'adapters/database/memory', true)).toBe(true)
    expect(allowed('application', 'adapters/files/local', true)).toBe(true)
  })

  it('lets http tests import any adapter, and other adapter tests only memory ones', () => {
    expect(allowed('adapters/http', 'adapters/files/local', true)).toBe(true)
    expect(allowed('adapters/files/local', 'adapters/cluster/memory', true)).toBe(true)
    expect(allowed('adapters/files/local', 'adapters/database/postgres', true)).toBe(false)
  })
})
