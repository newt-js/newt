import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { useCaseOf } from './use-case-of'

const CODE = `export class Order_Module {
  // async ship(input: { id: string }): Promise<void> removed
  async rename(input: { id: string, name: string }): Promise<Order> { return this.get(input) }
  async purge(): Promise<void> {}
}
`

test('reads a use case from its method, its inputs and whether it tells nothing', () => {
  expect(useCaseOf(CODE, 'Order_Module', 'rename')).toEqual({ inputs: 1, returnsNothing: false })
  expect(useCaseOf(CODE, 'Order_Module', 'purge')).toEqual({ inputs: 0, returnsNothing: true })
})

test('none in a comment, or in another class', () => {
  expect(useCaseOf(CODE, 'Order_Module', 'ship')).toBeNull()
  expect(useCaseOf(CODE, 'Other_Module', 'rename')).toBeNull()
})
