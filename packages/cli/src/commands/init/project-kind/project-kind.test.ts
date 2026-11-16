import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { askProjectKind } from './project-kind'

test('asks, offering a backend', async () => {
  const questions: string[] = []
  expect(await askProjectKind(async (question, suggested) => {
    questions.push(`${question} [${suggested}]`)
    return 'Monorepo'
  })).toBe('monorepo')
  expect(questions).toEqual(['A backend or a monorepo? (backend or monorepo) [backend]'])
})

test('refuses another answer', async () => {
  await expect(askProjectKind(async () => 'both')).rejects.toThrow("'both' is neither: answer backend or monorepo")
})
