import { settlesWithin } from '../../../../application/runtime/worker/settles-within/settles-within'

export async function stopServer(server: Bun.Server<undefined>, deadlineMs: number): Promise<void> {
  const stopping = server.stop()
  if (await settlesWithin(stopping, deadlineMs)) {
    await stopping
  } else {
    await server.stop(true)
  }
}
