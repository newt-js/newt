import type { Clock }            from '../../../../domain/clock/clock'
import type { EventBus }         from '../../../../domain/events/bus/event-bus'
import { DomainEventEmitter }    from '../../../../domain/events/domain-event-emitter/domain-event-emitter'
import type { DomainEventClass } from '../../../../domain/events/event/domain-event-class'
import type { Records }          from '../../../../domain/repository/records/records'
import { UseCaseRunner }         from '../../../../domain/use-case/use-case-runner/use-case-runner'
import type { Database }         from '../../../database/database'
import { platformScope }         from '../../../platform/platform-scope/platform-scope'
import { Platform }              from '../../../platform/platform/platform'
import { PollLoop }              from '../../poll-loop/poll-loop'
import { Cron }                  from '../cron/cron'
import type { ScheduleTick }     from '../schedule-tick'
import { tickOf }                from '../tick-of/tick-of'
import type { TickRow }          from '../tick-row'

const NAME = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/

const LOOK_EVERY_MS = 60_000

type Schedule = { name: string, cron: Cron, event: DomainEventClass<ScheduleTick>, firedAt?: string }

export class Schedules {

  private readonly schedules = new Map<string, Schedule>()
  private ticks: Records<TickRow> | undefined
  private readonly loop = new PollLoop(() => this.tick(), () => this.untilNext(), '[Schedules] telling what is due failed, it tries again at its next look')

  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
    private readonly useCaseRunner: UseCaseRunner,
    private readonly platform: Platform,
    private readonly clock: Clock,
  ) {}

  define(name: string, cron: string): DomainEventEmitter<ScheduleTick> {
    if (!NAME.test(name)) {
      throw new Error(`A schedule is named as an event, '<module>.<name>': '${name}' is not`)
    }
    if (this.schedules.has(name)) {
      throw new Error(`A schedule named '${name}' is defined already`)
    }
    const parsed = Cron.parse(cron)
    parsed.next(this.clock.now())
    const event = tickOf(name, this.clock)
    this.schedules.set(name, { name, cron: parsed, event })
    this.useCaseRunner.registry.schedule(name, parsed.expression)
    return new DomainEventEmitter(this.bus, event)
  }

  start(): void {
    platformScope.run(this.platform, () => this.loop.start())
  }

  stop(): Promise<void> {
    return this.loop.stop()
  }

  async tick(): Promise<void> {
    const failures: unknown[] = []
    for (const schedule of this.schedules.values()) {
      const dueAt = schedule.cron.latest(this.clock.now()).toISOString()
      if (schedule.firedAt !== undefined && schedule.firedAt >= dueAt) {
        continue
      }
      try {
        await this.useCaseRunner.run('schedule.tick', () => this.fire(schedule, dueAt))
        schedule.firedAt = dueAt
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length === 1) {
      throw failures[0]
    }
    if (failures.length > 1) {
      throw new AggregateError(failures, `${failures.length} schedules could not be told`)
    }
  }

  private fire(schedule: Schedule, dueAt: string): Promise<void> {
    const ticks = this.ticks ??= this.database.records<TickRow>('newt_schedule_tick')
    return this.database.run(async () => {
      const [last] = await ticks.find({ id: schedule.name })
      if (!last) {
        return ticks.insert({ id: schedule.name, dueAt })
      }
      if (last.dueAt >= dueAt) {
        return
      }
      await ticks.update(schedule.name, last.version, { dueAt })
      await this.bus.publish(new schedule.event({ dueAt }))
    })
  }

  private untilNext(): number {
    const now = this.clock.now()
    return Math.min(LOOK_EVERY_MS, ...[...this.schedules.values()].map(schedule => schedule.cron.next(now).getTime() - now.getTime()))
  }
}
