import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../cluster/memory-cluster/memory-cluster'
import { captureLines }  from '../../platform/capture-lines/capture-lines'
import { platformScope } from '../../platform/platform-scope/platform-scope'
import { Platform }      from '../../platform/platform/platform'
import { ConsoleEmail }  from './console-email'

test('writes to the log whom it was for, its subject and its text', async () => {
  const platform = new Platform({ cluster: new MemoryCluster() })
  const logs = captureLines(platform)

  await platformScope.run(platform, () => new ConsoleEmail().send({ to: ['ana@example.com', 'eva@example.com'], subject: 'Hi', text: 'Hello' }))

  expect(logs.said('info')).toEqual(['[email] to ana@example.com, eva@example.com: Hi\nHello'])
  logs.restore()
})
