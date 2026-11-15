import { PrivateFiles } from './private-files/private-files'
import { PublicFiles }  from './public-files/public-files'

export type ContextStorage = {
  readonly private: PrivateFiles
  readonly public: PublicFiles
}
