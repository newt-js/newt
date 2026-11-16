import { Ask } from '../../commands/command'

export const terminalAsk: Ask = async (question, suggested) => (prompt(`${question} (${suggested})`) ?? '').trim() || suggested
