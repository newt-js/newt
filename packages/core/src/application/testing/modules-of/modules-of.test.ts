import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { defineFeature } from '../../../domain/feature/define-feature/define-feature'
import { Module }        from '../../../domain/module/module/module'
import { UseCaseRunner } from '../../../domain/use-case/use-case-runner/use-case-runner'
import { UseCase }       from '../../../domain/use-case/use-case/use-case'
import { modulesOf }     from './modules-of'

class Template_Module extends Module {
  constructor(runner: UseCaseRunner) {
    super('campaigns[template]', runner)
  }

  @UseCase()
  async archive(): Promise<string> {
    return 'archived'
  }
}

class Log_Module extends Module {
  constructor(runner: UseCaseRunner) {
    super('campaigns[log]', runner)
  }
}

describe('modulesOf', () => {
  test("gives a feature's modules whole, those it keeps internal too, with what their contract does not show", async () => {
    const runner = new UseCaseRunner()
    const template = new Template_Module(runner)
    const log = new Log_Module(runner)
    const campaigns = defineFeature('campaigns', { useCaseRunner: runner }, { template, log }, { internal: ['log'] })

    const modules = modulesOf(campaigns)

    expect(modules.template).toBe(template)
    expect(modules.log).toBe(log)
    expect(await modules.template.archive()).toBe('archived')
  })
})
