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

  test('is none for a module of no feature, or a name not so made', () => {
    expect(featureOfModule('order')).toBeNull()
    expect(featureOfModule('campaigns[template].create')).toBeNull()
    expect(featureOfModule('Campaigns[template]')).toBeNull()
  })
})
