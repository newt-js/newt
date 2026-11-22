/// <reference path="./agents/markdown.d.ts" />
import { default as FRONTEND_MD } from './agents/frontend.md' with { type: 'text' }

/** How a context's app is built: the guide `newt add app` leaves in docs/agents/. */
export const FRONTEND_GUIDE = { path: 'docs/agents/frontend.md', content: FRONTEND_MD }

/** The line of AGENTS.md that points at it. */
export const FRONTEND_POINTER = '- `docs/agents/frontend.md`: how a context\'s app (`src/contexts/<context>/app/`) is built. Read it before touching one.'
