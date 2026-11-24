type Received = { from: string, to: string[], data: string }

type SmtpServerOptions = {
  /** Answers MAIL FROM with a failure. */
  refuses?: boolean
  /** Takes connections and never says a word. */
  silent?: boolean
}

type Session = Received & { line: string, readingData: boolean }

/** An SMTP server that keeps what it is sent, with the commands it got; it offers no TLS. */
export function startSmtpServer({ refuses = false, silent = false }: SmtpServerOptions = {}) {
  const received: Received[] = []
  const commands: string[] = []
  const answerTo = (line: string, session: Session): string => {
    if (session.readingData) {
      if (line !== '.') {
        session.data += `${line}\n`
        return ''
      }
      received.push({ from: session.from, to: session.to, data: session.data })
      session.readingData = false
      return '250 kept\r\n'
    }
    commands.push(line)
    const command = line.toUpperCase()
    if (command.startsWith('EHLO')) return '250-test\r\n250 AUTH PLAIN\r\n'
    if (command.startsWith('AUTH')) return '235 in\r\n'
    if (command.startsWith('MAIL FROM')) {
      session.from = line.slice('MAIL FROM:'.length)
      return refuses ? '451 try later\r\n' : '250 ok\r\n'
    }
    if (command.startsWith('RCPT TO')) {
      session.to.push(line.slice('RCPT TO:'.length))
      return '250 ok\r\n'
    }
    if (command === 'DATA') {
      session.readingData = true
      return '354 go on\r\n'
    }
    if (command === 'QUIT') return '221 bye\r\n'
    return '502 not known\r\n'
  }
  const server = Bun.listen<Session>({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open: socket => {
        socket.data = { from: '', to: [], data: '', line: '', readingData: false }
        if (!silent) socket.write('220 test\r\n')
      },
      data: (socket, bytes) => {
        const lines = (socket.data.line + bytes.toString()).split('\r\n')
        socket.data.line = lines.pop()!
        for (const line of lines) {
          const answer = answerTo(line, socket.data)
          if (answer) socket.write(answer)
        }
      },
    },
  })
  return { url: `smtp://127.0.0.1:${server.port}`, port: server.port, received, commands, stop: () => server.stop(true) }
}
