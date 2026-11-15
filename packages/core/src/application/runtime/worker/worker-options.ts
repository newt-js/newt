export type WorkerOptions = {
  concurrency: number
  pollMs: number
  leaseMs: number
  backoffMs: number
  maxBackoffMs: number
  keepDoneMs: number
  seenEveryMs: number
  orphansCheckEveryMs: number
}

export type WorkerOptionsGiven = { [K in keyof WorkerOptions]?: WorkerOptions[K] | undefined }
