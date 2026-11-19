import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { askFirstBackend } from './first-backend'

test('asks, offering api', async () => {
  const questions: string[] = []
  expect(await askFirstBackend(async (question, suggested) => {
    questions.push(`${question} [${suggested}]`)
    return suggested
  })).toBe('apps/api')
  expect(questions).toEqual(["Its first backend's name, or none? [api]"])
})

test('a name goes in apps/, a path stays', async () => {
  expect(await askFirstBackend(async () => 'billing')).toBe('apps/billing')
  expect(await askFirstBackend(async () => 'services/core/')).toBe('services/core')
})

test('none leaves the monorepo empty', async () => {
  expect(await askFirstBackend(async () => 'None')).toBeUndefined()
})
