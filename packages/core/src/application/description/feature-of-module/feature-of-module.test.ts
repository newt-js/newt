import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { featureOfModule } from './feature-of-module'

describe('featureOfModule', () => {
  test('is the name before the brackets of a module of a feature', () => {
    expect(featureOfModule('campaigns[template]')).toBe('campaigns')
    expect(featureOfModule('salesOrders[orderLine]')).toBe('salesOrders')
  })
})
