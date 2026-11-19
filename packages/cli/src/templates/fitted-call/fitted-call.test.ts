import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { fittedCall } from './fitted-call'

test('a call that fits stays on one line', () => {
  expect(fittedCall('  ', 'define', ["'a'", 'b'])).toBe("  define('a', b)")
})

test('a call that does not fit puts each argument on a line of its own', () => {
  const head = 'export const PriceChangeRequested_Created = defineEvent'
  expect(fittedCall('', head, ["'priceChangeRequested.created'", 'PriceChangeRequestedSchema'])).toBe(
    `${head}(\n  'priceChangeRequested.created',\n  PriceChangeRequestedSchema,\n)`,
  )
})

test('keeps what follows the call after its closing parenthesis', () => {
  expect(fittedCall('    ', 'this.x = base.schedules.define', [`'${'a'.repeat(40)}'`, "'0 3 * * *'"], ';')).toEndWith('\n    );')
})
