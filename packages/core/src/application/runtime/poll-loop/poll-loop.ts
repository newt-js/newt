import { log } from '../../platform/log/log'

export class PollLoop {

  private readonly loops = new Set<Promise<void>>()
  private looking = false
  private generation = 0
  private woken = false
  private signal: (() => void) | null = null

  constructor(
    private readonly pass: () => Promise<void>,
    private readonly pauseMs: () => number,
    private readonly failed: string,
  ) {}

  get running(): boolean {
    return this.looking
  }

  start(): boolean {
    if (this.looking) {
      return false
    }
    this.looking = true
    const loop: Promise<void> = this.work(++this.generation).finally(() => this.loops.delete(loop))
    this.loops.add(loop)
    return true
  }

  async stop(): Promise<void> {
    this.looking = false
    this.signal?.()
    await Promise.all([...this.loops])
  }

  wake(): void {
    this.woken = true
    this.signal?.()
  }

  private async work(generation: number): Promise<void> {
    const current = () => this.looking && this.generation === generation
    while (current()) {
      this.woken = false
      try {
        await this.pass()
      } catch (error) {
        log.error(this.failed, { error })
      }
      if (current() && !this.woken) {
        await this.pause()
      }
    }
  }

  private pause(): Promise<void> {
    return new Promise(resolve => {
      let timer: ReturnType<typeof setTimeout> | undefined = undefined
      const done = () => {
        clearTimeout(timer)
        this.signal = null
        resolve()
      }
      timer = setTimeout(done, Math.max(this.pauseMs(), 0))
      this.signal = done
    })
  }
}
