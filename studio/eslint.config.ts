import { newt } from '@newt-js/lint'

export default newt({ root: import.meta.dirname, contexts: { folder: 'src/contexts' } })
