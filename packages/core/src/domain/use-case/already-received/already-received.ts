export class AlreadyReceived extends Error {
  constructor(readonly event: string, readonly queue: string) {
    super(`${queue} reacted to the event ${event} already: its inbox keeps it, so it does not run twice`)
    this.name = 'AlreadyReceived'
  }
}
