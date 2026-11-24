import { afterEach }       from 'bun:test'
import { beforeEach }      from 'bun:test'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ConsoleEmail }    from '../../../../application/email/console-email/console-email'
import { MemoryEmail }     from '../../../../application/email/memory-email/memory-email'
import { startSmtpServer } from '../fixtures/start-smtp-server/start-smtp-server'
import { smtpEmail }       from './smtp-email'

const VARIABLES = ['SMTP_URL', 'EMAIL_FROM', 'SALES_ORDERS_EMAIL_FROM', 'NODE_ENV']
const MESSAGE = { to: 'ana@example.com', subject: 'Welcome', text: 'Hello' }
const before = Object.fromEntries(VARIABLES.map(name => [name, Bun.env[name]]))

beforeEach(() => {
  for (const name of VARIABLES) delete Bun.env[name]
})

afterEach(() => {
  for (const name of VARIABLES) {
    if (before[name] === undefined) delete Bun.env[name]
    else Bun.env[name] = before[name]
  }
})

describe('smtpEmail', () => {
  test('keeps the emails in memory for the tests, whatever is configured', async () => {
    Bun.env.SMTP_URL = 'smtp://mail.test'

    expect(await smtpEmail().open('sales-orders', { place: 'memory' })).toBeInstanceOf(MemoryEmail)
  })

  test('writes them to the console in development, until there is a server', async () => {
    Bun.env.NODE_ENV = 'development'

    expect(await smtpEmail().open('sales-orders', { place: 'configured' })).toBeInstanceOf(ConsoleEmail)
  })

  test('sends them through the server, from the address of every context or from its own', async () => {
    const server = startSmtpServer()
    Object.assign(Bun.env, { NODE_ENV: 'development', SMTP_URL: server.url, EMAIL_FROM: 'all@shop.test' })
    await (await smtpEmail().open('sales-orders', { place: 'configured' })).send(MESSAGE)
    Bun.env.SALES_ORDERS_EMAIL_FROM = 'orders@shop.test'
    await (await smtpEmail().open('sales-orders', { place: 'configured' })).send(MESSAGE)
    server.stop()

    expect(server.received.map(each => each.from)).toEqual(['<all@shop.test>', '<orders@shop.test>'])
  })

  test('says which variable is missing', async () => {
    const open = () => smtpEmail().open('sales-orders', { place: 'configured' })

    await expect(open()).rejects.toThrow('SMTP_URL is not set')
    Bun.env.SMTP_URL = 'smtp://mail.test'
    await expect(open()).rejects.toThrow('EMAIL_FROM is not set')
  })
})
