import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { MemoryEmail }  from '../../email/memory-email/memory-email'
import { contextEmail } from './context-email'

test('is what the context was given', () => {
  const email = new MemoryEmail()
  expect(contextEmail(email, 'shop')).toBe(email)
})

test('without any, says which context has nothing to send an email with', () => {
  const sending = contextEmail(undefined, 'shop').send({ to: 'ana@example.com', subject: 'Hi', text: 'Hello' })
  expect(sending).rejects.toThrow("The context 'shop' was given nothing to send emails with")
})
