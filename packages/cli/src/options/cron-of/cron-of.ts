import { CommandError } from '../../commands/command-error/command-error'

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of the month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of the week', min: 0, max: 7 },
]

const PART = /^(\*|(\d+)(-(\d+))?)(\/(\d+))?$/

function fieldFits(field: string, min: number, max: number): boolean {
  return field.split(',').every(part => {
    const match = PART.exec(part)
    if (!match) return false
    const [, , from, , to, , step] = match
    const inRange = (value: string | undefined) => value === undefined || (Number(value) >= min && Number(value) <= max)
    return inRange(from) && inRange(to) && (step === undefined || Number(step) > 0) && (to === undefined || Number(from) <= Number(to))
  })
}

/** The cron given, when its five fields are ones a schedule takes: numbers, ranges, lists, steps or *. */
export function cronOf(given: string): string {
  const fields = given.trim().split(/\s+/)
  const bad = fields.length === FIELDS.length ? FIELDS.find((field, at) => !fieldFits(fields[at]!, field.min, field.max)) : undefined
  if (fields.length !== FIELDS.length || bad) {
    const why = bad ? `its ${bad.name} is not one from ${bad.min} to ${bad.max}` : 'it has five fields'
    throw new CommandError(`'${given}' is not a cron: ${why}, as in "0 3 * * *", every day at 3:00 UTC`)
  }
  return fields.join(' ')
}
