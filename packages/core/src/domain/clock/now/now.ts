import { clockScope }  from '../clock-scope/clock-scope'
import { systemClock } from '../system-clock/system-clock'

export function now(): Date {
  return (clockScope.get() ?? systemClock).now()
}
