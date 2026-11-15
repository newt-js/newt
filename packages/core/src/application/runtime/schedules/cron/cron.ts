import { cronFieldValues } from '../cron-field-values/cron-field-values'
import { DAY }             from '../start-of-day/start-of-day'
import { startOfDay }      from '../start-of-day/start-of-day'

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 7 },
] as const

const MINUTE = 60_000
const SEARCH_DAYS = 366 * 28

export class Cron {

  private constructor(
    readonly expression: string,
    private readonly minutes: Set<number>,
    private readonly hours: Set<number>,
    private readonly days: Set<number>,
    private readonly months: Set<number>,
    private readonly weekdays: Set<number>,
    private readonly eitherDay: boolean,
  ) {}

  static parse(expression: string): Cron {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      throw new Error(`A cron expression has five fields (minute hour day-of-month month day-of-week): '${expression}' has ${parts.length}`)
    }
    const [minutes, hours, days, months, weekdays] = parts.map((part, i) => cronFieldValues(part, FIELDS[i]!, expression))
    if (weekdays!.has(7)) {
      weekdays!.add(0)
    }
    return new Cron(expression, minutes!, hours!, days!, months!, weekdays!, !parts[2]!.startsWith('*') && !parts[4]!.startsWith('*'))
  }

  next(time: Date): Date {
    const from = Math.floor(time.getTime() / MINUTE) * MINUTE + MINUTE
    for (let day = startOfDay(from); day < from + SEARCH_DAYS * DAY; day += DAY) {
      if (!this.isDue(day)) {
        continue
      }
      const first = this.minuteOf(day, minute => minute >= from, 1)
      if (first !== undefined) {
        return new Date(first)
      }
    }
    throw new Error(`The cron expression '${this.expression}' is never due`)
  }

  latest(time: Date): Date {
    const until = Math.floor(time.getTime() / MINUTE) * MINUTE
    for (let day = startOfDay(until); day > until - SEARCH_DAYS * DAY; day -= DAY) {
      if (!this.isDue(day)) {
        continue
      }
      const last = this.minuteOf(day, minute => minute <= until, -1)
      if (last !== undefined) {
        return new Date(last)
      }
    }
    throw new Error(`The cron expression '${this.expression}' is never due`)
  }

  private isDue(day: number): boolean {
    const date = new Date(day)
    if (!this.months.has(date.getUTCMonth() + 1)) {
      return false
    }
    const onDay = this.days.has(date.getUTCDate())
    const onWeekday = this.weekdays.has(date.getUTCDay())
    return this.eitherDay ? onDay || onWeekday : onDay && onWeekday
  }

  private minuteOf(day: number, takes: (minute: number) => boolean, direction: 1 | -1): number | undefined {
    const hours = [...this.hours].sort((a, b) => (a - b) * direction)
    const minutes = [...this.minutes].sort((a, b) => (a - b) * direction)
    for (const hour of hours) {
      for (const minute of minutes) {
        const time = day + hour * 60 * MINUTE + minute * MINUTE
        if (takes(time)) {
          return time
        }
      }
    }
    return undefined
  }
}
