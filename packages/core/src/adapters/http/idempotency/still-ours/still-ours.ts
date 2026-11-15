import { StaleVersion } from '../../../../domain/errors/stale-version/stale-version'

export async function stillOurs(write: () => Promise<void>): Promise<void> {
  try {
    await write()
  } catch (error) {
    if (!(error instanceof StaleVersion)) {
      throw error
    }
  }
}
