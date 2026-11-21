import { newt } from '@newt-js/lint'

export default newt({
  root: import.meta.dirname,
  contexts: {
    folder: 'src/contexts',
    // No context uses another yet. auth stays closed for good:
    // the others sign in through OAuth.
    uses: { auth: [], panel: [], backoffice: [] },
  },
})
