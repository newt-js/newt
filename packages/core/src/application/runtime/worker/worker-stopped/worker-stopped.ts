export class WorkerStopped extends DOMException {
  constructor() {
    super('The worker stops, and waits no longer for this job', 'AbortError')
  }
}
