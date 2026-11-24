import { ContextBase }             from '../../context/context-base/context-base'
import { MemoryEmail }             from '../../email/memory-email/memory-email'
import type { CapturedLines }      from '../../platform/capture-lines/capture-lines'
import { captureLines }            from '../../platform/capture-lines/capture-lines'
import { Platform }                from '../../platform/platform/platform'
import { TestClock }               from '../test-clock/test-clock'
import type { TestContextOptions } from './test-context-options'

export type TestContext = {
  base: ContextBase
  clock: TestClock
  logs: CapturedLines
  /** What sends its emails: none goes out, and `sent` has them all. */
  email: MemoryEmail
  settle(): Promise<void>
  close(): Promise<void>
}

export function testContext({ cluster, at, ...options }: TestContextOptions): TestContext {
  const clock = new TestClock(at)
  const platform = new Platform({ cluster })
  const logs = captureLines(platform)
  const email = new MemoryEmail()
  const base = new ContextBase({ ...options, platform, clock, email })
  return {
    base,
    clock,
    logs,
    email,
    settle: () => base.worker.idle(),
    close: async () => {
      try {
        await Promise.all([base.schedules.stop(), base.worker.stop()])
        await base.close()
      } finally {
        logs.restore()
      }
    },
  }
}
