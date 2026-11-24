import { afterEach }       from 'bun:test'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { startSmtpServer } from '../fixtures/start-smtp-server/start-smtp-server'
import { SmtpEmailSender } from './smtp-email-sender'

const FROM = 'Shop <hello@shop.test>'
const MESSAGE = { to: 'ana@example.com', subject: 'Welcome', text: 'Hello, Ana' }

let server: ReturnType<typeof startSmtpServer>

afterEach(() => server?.stop())

describe('SmtpEmailSender', () => {
  test('hands an email to the server, from whom it was told', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send(MESSAGE)

    expect(server.received).toHaveLength(1)
    expect(server.received[0]).toMatchObject({ from: '<hello@shop.test>', to: ['<ana@example.com>'] })
    expect(server.received[0]!.data).toContain('From: Shop <hello@shop.test>')
    expect(server.received[0]!.data).toContain('Subject: Welcome')
    expect(server.received[0]!.data).toContain('Hello, Ana')
  })

  test('sends to several addresses, with its HTML and where to answer', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send({ ...MESSAGE, to: ['ana@example.com', 'eva@example.com'], html: '<b>Hello</b>', replyTo: 'help@shop.test' })

    expect(server.received[0]!.to).toEqual(['<ana@example.com>', '<eva@example.com>'])
    expect(server.received[0]!.data).toContain('<b>Hello</b>')
    expect(server.received[0]!.data).toContain('Reply-To: help@shop.test')
  })

  test('is from whom the email says, and from the same address when it only says a name', async () => {
    server = startSmtpServer()
    const sender = new SmtpEmailSender({ url: server.url, from: FROM })

    await sender.send({ ...MESSAGE, from: { name: 'Panel' } })
    await sender.send({ ...MESSAGE, from: { name: 'Panel', address: 'hi@panel.test' } })

    expect(server.received.map(each => each.from)).toEqual(['<hello@shop.test>', '<hi@panel.test>'])
    expect(server.received[0]!.data).toContain('From: Panel <hello@shop.test>')
    expect(server.received[1]!.data).toContain('From: Panel <hi@panel.test>')
  })

  test('a name with another address in it is still a name', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send({ ...MESSAGE, from: { name: 'Eva <eva@example.com>, Panel\r\nBcc: ana@example.com' } })

    expect(server.received[0]!.from).toBe('<hello@shop.test>')
    expect(server.received[0]!.to).toEqual(['<ana@example.com>'])
    expect(server.received[0]!.data).not.toMatch(/^Bcc:/m)
  })

  test('refuses to be from something that is no address', () => {
    expect(() => new SmtpEmailSender({ url: 'smtp://mail.test', from: 'Shop' })).toThrow('EMAIL_FROM is not an address')
  })

  test('keeps accents', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send({ ...MESSAGE, subject: 'Contraseña' })

    expect(server.received[0]!.data).toContain('Subject: =?UTF-8?Q?Contrase=C3=B1a?=')
  })

  test('signs in with the user and the password of its url', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: `smtp://me:p%40ss@127.0.0.1:${server.port}`, from: FROM }).send(MESSAGE)

    expect(server.commands).toContain(`AUTH PLAIN ${btoa('\0me\0p@ss')}`)
  })

  test('a line break in a subject adds no header', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send({ ...MESSAGE, subject: 'Hi\r\nBcc: eva@example.com' })

    expect(server.received[0]!.to).toEqual(['<ana@example.com>'])
    expect(server.received[0]!.data).not.toMatch(/^Bcc:/m)
  })

  test('an address is never read as a list', async () => {
    server = startSmtpServer()

    await new SmtpEmailSender({ url: server.url, from: FROM }).send({ ...MESSAGE, to: 'ana@example.com, eva@example.com' }).catch(() => {})

    expect(server.received.flatMap(each => each.to)).not.toContain('<eva@example.com>')
  })

  test('rejects when the server refuses it', async () => {
    server = startSmtpServer({ refuses: true })

    await expect(new SmtpEmailSender({ url: server.url, from: FROM }).send(MESSAGE)).rejects.toThrow('451')
  })

  test('rejects when the server says nothing', async () => {
    server = startSmtpServer({ silent: true })

    await expect(new SmtpEmailSender({ url: server.url, from: FROM, timeoutMs: 50 }).send(MESSAGE)).rejects.toThrow(/Timeout|Greeting/)
  })

  test('signs in over TLS or not at all', async () => {
    server = startSmtpServer()
    const url = `smtp://me:secret@0.0.0.0:${server.port}`

    await expect(new SmtpEmailSender({ url, from: FROM }).send(MESSAGE)).rejects.toThrow()
    expect(server.commands.some(each => each.startsWith('AUTH'))).toBe(false)

    await new SmtpEmailSender({ url: `${url}?requireTLS=false`, from: FROM }).send(MESSAGE)
    expect(server.received).toHaveLength(1)
  })

  test('refuses a url of something else', () => {
    expect(() => new SmtpEmailSender({ url: 'https://mail.test', from: FROM })).toThrow('SMTP_URL is not')
    expect(() => new SmtpEmailSender({ url: 'mail.test', from: FROM })).toThrow('SMTP_URL is not')
  })
})
