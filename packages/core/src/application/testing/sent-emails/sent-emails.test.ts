import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { ConsoleEmail } from '../../email/console-email/console-email'
import { MemoryEmail }  from '../../email/memory-email/memory-email'
import { sentEmails }   from './sent-emails'

test('are those a context keeps in memory', async () => {
  const email = new MemoryEmail()
  await email.send({ to: 'ana@example.com', subject: 'Hi', text: 'Hello' })

  expect(sentEmails({ name: 'shop', email })).toMatchObject([{ to: 'ana@example.com', subject: 'Hi' }])
})

test('are not known of a context that sends them', () => {
  expect(() => sentEmails({ name: 'shop', email: new ConsoleEmail() })).toThrow("The context 'shop' does not keep its emails in memory")
})
