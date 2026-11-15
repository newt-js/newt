import { CronField } from '../cron-field'

export function cronFieldValues(part: string, field: CronField, expression: string): Set<number> {
  const taken = new Set<number>()
  const wrong = () => new Error(`'${part}' is not a ${field.name} (${field.min}-${field.max}) in the cron expression '${expression}'`)
  const number = (text: string) => {
    if (!/^\d+$/.test(text)) {
      throw wrong()
    }
    const value = Number(text)
    if (value < field.min || value > field.max) {
      throw wrong()
    }
    return value
  }
  for (const item of part.split(',')) {
    const [range, step, ...rest] = item.split('/')
    if (rest.length > 0 || range === undefined) {
      throw wrong()
    }
    const every = step === undefined ? 1 : number(step)
    if (every < 1) {
      throw wrong()
    }
    const [from, to] = range === '*'
      ? [field.min, field.max]
      : range.includes('-')
        ? range.split('-').map(number) as [number, number]
        : [number(range), step === undefined ? number(range) : field.max]
    if (range.split('-').length > 2 || from > to) {
      throw wrong()
    }
    for (let value = from; value <= to; value += every) {
      taken.add(value)
    }
  }
  return taken
}
