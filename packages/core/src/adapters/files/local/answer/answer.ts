export const NEVER_RUNS = { 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'" }

export const answer = (status: number) => new Response(null, { status, headers: NEVER_RUNS })
