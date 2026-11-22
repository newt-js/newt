/** What can travel as JSON: an event's payload, so it reads the same from another feature as from the server. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }
