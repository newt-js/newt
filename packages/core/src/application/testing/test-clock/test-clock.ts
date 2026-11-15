import { Clock } from '../../../domain/clock/clock'

const START = '2026-01-01T00:00:00.000Z'

export class TestClock implements Clock {

  private time: number

  constructor(at: Date | string = START) {
    this.time = new Date(at).getTime()
  }

  now(): Date {
    return new Date(this.time)
  }

  set(at: Date | string): void {
    this.time = new Date(at).getTime()
  }

  advance(ms: number): void {
    this.time += ms
  }
}
