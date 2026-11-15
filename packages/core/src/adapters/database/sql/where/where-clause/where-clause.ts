import { CriteriaNode }    from '../../../../../domain/criteria/criteria/criteria-node'
import { SqlDialect }      from '../../dialect/sql-dialect'
import { fieldConditions } from '../field-conditions/field-conditions'

export type WhereContext = {
  column(field: string): string
  value(field: string, operand: unknown): unknown
}

export function whereClause(node: CriteriaNode, dialect: SqlDialect, context: WhereContext, params: unknown[]): string {
  switch (node.kind) {
    case 'all': {
      const parts = node.of.map(each => whereClause(each, dialect, context, params)).filter(part => part !== dialect.always)
      return parts.length === 0 ? dialect.always : parts.length === 1 ? parts[0]! : `(${parts.join(' AND ')})`
    }
    case 'any': {
      const parts = node.of.map(each => whereClause(each, dialect, context, params))
      return parts.length === 0 ? dialect.never : parts.length === 1 ? parts[0]! : `(${parts.join(' OR ')})`
    }
    case 'field': {
      const parts = fieldConditions(node.field, node.condition, dialect, context, params)
      return parts.length === 1 ? parts[0]! : `(${parts.join(' AND ')})`
    }
  }
}
