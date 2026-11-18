import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { envNameOf }   from './env'
import { requiredEnv } from './env'

test('names the environment variables of a context after it, in capitals', () => {
  expect(envNameOf('sales-orders')).toBe('SALES_ORDERS')
})

test('says which variable is missing, and where to see them', () => {
  delete Bun.env.NEWT_TEST_MISSING
  expect(() => requiredEnv('NEWT_TEST_MISSING')).toThrow('NEWT_TEST_MISSING is not set: see .env.example')
})
