import { Condition }    from '../../../../../domain/criteria/criteria/condition'
import { SqlDialect }   from '../../dialect/sql-dialect'
import { WhereContext } from '../where-clause/where-clause'

export function fieldConditions(field: string, condition: Condition<unknown>, dialect: SqlDialect, context: WhereContext, params: unknown[]): string[] {
  const column = dialect.quote(context.column(field))
  const value = (operand: unknown) => {
    params.push(context.value(field, operand))
    return dialect.param(params.length)
  }
  const nul = (operand: unknown) => typeof operand === 'string' && operand.includes('\u0000')
  const beforeNul = (operand: unknown) => value((operand as string).slice(0, (operand as string).indexOf('\u0000')))
  return Object.entries(condition).map(([operator, operand]) => {
    switch (operator) {
      case 'eq': return operand === null ? `${column} IS NULL` : nul(operand) ? dialect.never : `${column} = ${value(operand)}`
      case 'ne': return operand === null ? `${column} IS NOT NULL` : nul(operand) ? dialect.always : dialect.distinct(column, value(operand))
      case 'in': {
        const values = (operand as unknown[]).filter(each => each !== null)
        const list = values.filter(each => !nul(each))
        const among = list.length === 0 ? dialect.never : `${column} IN (${list.map(value).join(', ')})`
        return values.length === (operand as unknown[]).length ? among : `(${among} OR ${column} IS NULL)`
      }
      case 'gt': return nul(operand) ? `${column} > ${beforeNul(operand)}` : `${column} > ${value(operand)}`
      case 'gte': return nul(operand) ? `${column} > ${beforeNul(operand)}` : `${column} >= ${value(operand)}`
      case 'lt': return nul(operand) ? `${column} <= ${beforeNul(operand)}` : `${column} < ${value(operand)}`
      case 'lte': return nul(operand) ? `${column} <= ${beforeNul(operand)}` : `${column} <= ${value(operand)}`
      case 'ieq': return typeof operand !== 'string' || nul(operand) ? dialect.never : dialect.ieq(column, () => value(operand))
      default: throw new Error(`Unknown operator '${operator}' on '${field}'`)
    }
  })
}
