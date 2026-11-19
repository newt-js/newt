import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { z }             from 'zod'
// --------------------------------------------------------
import { matches }       from '../../matches/matches'
import { InvalidFilter } from '../invalid-filter/invalid-filter'
import { InvalidSort }   from '../invalid-sort/invalid-sort'
import { defineFilter }  from './define-filter'

const ProductFilter = defineFilter({
  price: { field: 'priceCents', value: z.number().int(), ops: ['eq', 'lt', 'gte'] },
  brand: { field: 'brandId', value: z.string(), ops: ['eq', 'in'] },
}, { maxDepth: 2, maxConditions: 3 })

type ProductFilterDTO = z.infer<typeof ProductFilter.schema>

describe('defineFilter', () => {
  test('takes groups of the fields and operators it declares, and turns them into criteria in the row fields', () => {
    const filter = ProductFilter.schema.parse({ or: [{ field: 'price', op: 'lt', value: 500 }, { field: 'brand', op: 'in', value: ['acme', 'zeta'] }] })

    expect(ProductFilter.toCriteria<Record<string, unknown>>(filter)).toEqual({ or: [{ priceCents: { lt: 500 } }, { brandId: { in: ['acme', 'zeta'] } }] })
    expect(matches({ priceCents: 900, brandId: 'zeta' }, ProductFilter.toCriteria(filter))).toBe(true)
    expect(matches({ priceCents: 900, brandId: 'other' }, ProductFilter.toCriteria(filter))).toBe(false)
  })

  test('takes the short form too: values side by side, each equal, for fields that allow eq', () => {
    const filter = ProductFilter.schema.parse({ brand: 'acme', price: 500 })

    expect(ProductFilter.toCriteria<Record<string, unknown>>(filter)).toEqual({ brandId: 'acme', priceCents: 500 })
    expect(ProductFilter.toCriteria<Record<string, unknown>>(ProductFilter.schema.parse({}))).toEqual({})
    expect(ProductFilter.schema.safeParse({ brandId: 'acme' }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ brand: 5 }).success).toBe(false)
  })

  test('sorts by the fields it declares, up to three, and by none it does not', () => {
    const Sorted = defineFilter({ brand: { field: 'brandId', value: z.string(), ops: ['eq'] } }, { sort: ['priceCents', 'name'] })

    expect(Sorted.toOrder<{ priceCents: number, name: string }>(Sorted.sortSchema.parse([{ field: 'priceCents', direction: 'desc' }, { field: 'name' }]))).toEqual([{ field: 'priceCents', direction: 'desc' }, { field: 'name' }])
    expect(Sorted.toOrder(undefined)).toBeUndefined()
    expect(Sorted.sortSchema.safeParse([{ field: 'brandId' }]).success).toBe(false)
    expect(ProductFilter.sortSchema.safeParse([{ field: 'priceCents' }]).success).toBe(false)
  })

  test('says the row field each of its fields stands for', () => {
    expect(ProductFilter.fieldOf('brand')).toBe('brandId')
    expect(ProductFilter.fieldOf('price')).toBe('priceCents')
  })

  test('refuses a field, an operator or a value it does not declare', () => {
    expect(ProductFilter.schema.safeParse({ field: 'cost', op: 'eq', value: 1 }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'brand', op: 'lt', value: 'a' }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'price', op: 'eq', value: 'cheap' }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'price', op: 'eq', value: 1, extra: true }).success).toBe(false)
  })

  test('keeps a filter within its limits', () => {
    const leaf = { field: 'price', op: 'eq', value: 1 }

    expect(ProductFilter.schema.safeParse({ and: [{ or: [leaf] }] }).success).toBe(true)
    expect(ProductFilter.schema.safeParse({ and: [{ or: [{ and: [leaf] }] }] }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ or: [leaf, leaf, leaf, leaf] }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ or: [] }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ and: [] }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ or: [leaf, leaf, leaf] }).success).toBe(true)
  })

  test('nests 3 groups deep and takes 20 conditions, unless it says otherwise', () => {
    const Plain = defineFilter({ price: { field: 'priceCents', value: z.number(), ops: ['eq'] } })
    const leaf = { field: 'price', op: 'eq', value: 1 }

    expect(Plain.schema.safeParse({ and: [{ or: [{ and: [leaf] }] }] }).success).toBe(true)
    expect(Plain.schema.safeParse({ and: [{ or: [{ and: [{ or: [leaf] }] }] }] }).success).toBe(false)
    expect(Plain.schema.safeParse({ or: Array(20).fill(leaf) }).success).toBe(true)
    expect(Plain.schema.safeParse({ or: Array(21).fill(leaf) }).success).toBe(false)
  })

  test('an in lists up to 100 values, each one a value of its field', () => {
    const brands = (count: number) => ({ field: 'brand', op: 'in', value: Array.from({ length: count }, (_, i) => `b${i}`) })

    expect(ProductFilter.schema.safeParse(brands(100)).success).toBe(true)
    expect(ProductFilter.schema.safeParse(brands(101)).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'brand', op: 'in', value: 'acme' }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'brand', op: 'in', value: [1] }).success).toBe(false)
  })

  test('refuses a condition without a value, even when the value of its field may be left out', () => {
    const NameFilter = defineFilter({ name: { field: 'name', value: z.string().optional(), ops: ['eq', 'in'] } })

    expect(NameFilter.schema.safeParse({ field: 'name', op: 'eq' }).success).toBe(false)
    expect(NameFilter.schema.safeParse({ or: [{ field: 'name', op: 'eq' }, { field: 'name', op: 'eq', value: 'zzz' }] }).success).toBe(false)
    expect(NameFilter.schema.safeParse({ field: 'name', op: 'in', value: [undefined] }).success).toBe(false)
    expect(NameFilter.schema.safeParse({ field: 'name', op: 'eq', value: 'zzz' }).success).toBe(true)
    expect(NameFilter.schema.safeParse({ name: undefined }).success).toBe(true)
  })

  test('refuses anything more on a group or an in', () => {
    const leaf = { field: 'price', op: 'eq', value: 1 }

    expect(ProductFilter.schema.safeParse({ and: [leaf], extra: 1 }).success).toBe(false)
    expect(ProductFilter.schema.safeParse({ field: 'brand', op: 'in', value: ['a'], extra: 1 }).success).toBe(false)
  })

  test('turns an and group into an and of criteria', () => {
    const filter = ProductFilter.schema.parse({ and: [{ field: 'price', op: 'gte', value: 100 }, { field: 'brand', op: 'eq', value: 'acme' }] })

    expect(ProductFilter.toCriteria<Record<string, unknown>>(filter)).toEqual({ and: [{ priceCents: { gte: 100 } }, { brandId: { eq: 'acme' } }] })
  })

  test('types what a client may send', () => {
    const ok: ProductFilterDTO = { and: [{ field: 'price', op: 'gte', value: 1 }, { field: 'brand', op: 'in', value: ['a'] }] }
    // @ts-expect-error brand does not allow lt
    const wrong: ProductFilterDTO = { field: 'brand', op: 'lt', value: 'a' }
    expect([ok, wrong].length).toBe(2)
  })

  test('types the short form only with the fields that allow eq', () => {
    const AgeFilter = defineFilter({ age: { field: 'ageYears', value: z.number(), ops: ['gt'] } })

    // @ts-expect-error age does not allow eq
    expect(() => AgeFilter.parse({ age: 3 } satisfies Parameters<typeof AgeFilter.toCriteria>[0])).toThrow(InvalidFilter)
  })
})

describe('parse and parseSort', () => {
  test('give back what is valid', () => {
    expect(ProductFilter.parse({ field: 'price', op: 'lt', value: 500 })).toEqual({ field: 'price', op: 'lt', value: 500 })
    expect(defineFilter({}, { sort: ['name'] }).parseSort([{ field: 'name' }])).toEqual([{ field: 'name' }])
  })

  test('refuse what is not with a validation error, never a ZodError', () => {
    expect(() => ProductFilter.parse({ field: 'brand', op: 'lt', value: 'a' })).toThrow(InvalidFilter)
    expect(() => defineFilter({}, { sort: ['name'] }).parseSort([{ field: 'price' }])).toThrow(InvalidSort)
  })

  test('run first in toCriteria and toOrder, which take a filter and a sort as they came', () => {
    const wrongFilter = { field: 'brand', op: 'lt', value: 'a' } as unknown as Parameters<typeof ProductFilter.toCriteria>[0]
    const wrongSort = [{ field: 'price' }] as unknown as Parameters<ReturnType<typeof defineFilter<{}, 'name'>>['toOrder']>[0]
    expect(() => ProductFilter.toCriteria(wrongFilter)).toThrow(InvalidFilter)
    expect(() => defineFilter({}, { sort: ['name'] }).toOrder(wrongSort)).toThrow(InvalidSort)
    expect(defineFilter({}, { sort: ['name'] }).toOrder([])).toBeUndefined()
  })

  test('say the limits it goes beyond', () => {
    const many = { or: [1, 2, 3, 4].map(value => ({ field: 'price', op: 'eq', value })) }

    expect(() => ProductFilter.parse(many)).toThrow('The filter is not valid: A filter has at most 3 conditions')
  })
})

describe('the limits of a filter', () => {
  test('are checked before the rest: a hostile filter is refused at once, not a stack overflow', () => {
    const leaf = { field: 'price', op: 'eq', value: 1 }
    let deep: unknown = leaf
    for (let i = 0; i < 100_000; i++) {
      deep = { and: [deep] }
    }
    const wide = { or: Array.from({ length: 200_000 }, () => leaf) }
    const hollow = { or: Array.from({ length: 200_000 }, () => ({ and: [] })) }

    const started = performance.now()
    expect(ProductFilter.schema.safeParse(deep).error?.issues.map(issue => issue.message)).toEqual(['A filter nests at most 2 groups deep'])
    expect(ProductFilter.schema.safeParse(wide).error?.issues.map(issue => issue.message)).toEqual(['A filter has at most 3 conditions'])
    expect(ProductFilter.schema.safeParse(hollow).error?.issues.map(issue => issue.message)).toEqual(['A filter has at most 3 conditions'])
    expect(performance.now() - started).toBeLessThan(50)
  })
})
