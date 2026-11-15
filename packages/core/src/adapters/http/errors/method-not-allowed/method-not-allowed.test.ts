import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { MethodNotAllowed } from './method-not-allowed'

describe('MethodNotAllowed', () => {
  test('is a method_not_allowed error that says why', () => {
    const error = new MethodNotAllowed('PUT', '/api/things')

    expect([error.kind, error.code]).toEqual(['method_not_allowed', 'method_not_allowed'])
    expect(error.message).toBe('/api/things does not take PUT')
    expect(error.params).toEqual({ method: 'PUT', path: '/api/things' })
  })
})
