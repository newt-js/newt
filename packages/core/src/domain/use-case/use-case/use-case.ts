import { UseCaseOptions } from '../use-case-options'
import { UseCaseRunner }  from '../use-case-runner/use-case-runner'

export function UseCase(options?: UseCaseOptions) {
  return function <This extends { readonly name: string, readonly useCaseRunner: UseCaseRunner }, Args extends unknown[], Return>(
    method: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    const useCase = String(context.name)
    context.addInitializer(function (this: This) {
      this.useCaseRunner?.registry?.useCase(this, useCase, options)
    })
    return function (this: This, ...args: Args): Promise<Return> {
      return this.useCaseRunner.run(`${this.name}.${useCase}`, () => method.apply(this, args), options)
    }
  }
}
