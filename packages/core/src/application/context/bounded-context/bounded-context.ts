import { ContextBase } from '../context-base/context-base'

export abstract class BoundedContext<B extends ContextBase = ContextBase> {

  protected constructor(
    readonly name: string,
    readonly base: B,
  ) {}

  start(): void {
    this.base.worker.start()
    this.base.schedules.start()
  }

  async stopWorker(deadlineMs?: number): Promise<void> {
    await Promise.all([this.base.schedules.stop(), this.base.worker.stop(deadlineMs)])
  }

  async close(): Promise<void> {
    await this.base.close()
  }

  async stop(): Promise<void> {
    await this.stopWorker()
    await this.close()
  }
}
