import { ReferenceNotFound } from '../../errors/reference-not-found/reference-not-found'

/**
 * The entity of `entities` whose id is `id`, as a use case takes it from what another module's `find` gave: or
 * `ReferenceNotFound` (`400`, `The <name> <id> does not exist`) when there is none.
 *
 * ```ts
 * const customers = await this.deps.customers.customer.find({ id: customerId })
 * order.changeCustomer({ customer: referenced(customers, customerId, 'customer') })
 * ```
 */
export function referenced<T extends { id: string }>(entities: readonly T[], id: string, name: string): T {
  const entity = entities.find(each => each.id === id)
  if (!entity) {
    throw new ReferenceNotFound(name, id)
  }
  return entity
}
