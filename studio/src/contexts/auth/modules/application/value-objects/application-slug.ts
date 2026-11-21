import { z } from 'zod'

/** Lower case words joined by hyphens: `auth`, `back-office`. */
const WORDS = /^[a-z0-9]+(-[a-z0-9]+)*$/
const LONGEST = 40
/** What a slug made from a name leaves free at its end, for `-2`, `-3`… */
const ROOM_FOR_NUMBER = 6
/** The slug of a name with no letter or digit to keep. */
const NAMELESS = 'application'

/** `Gestión Fincas` → `gestion-fincas`: letters and digits, no accents. */
function fromName(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, LONGEST - ROOM_FOR_NUMBER)
    .replace(/-+$/, '')
  return words.length >= 2 ? words : NAMELESS
}

/** `count` slugs to try, from the `from`th: `fincas`, `fincas-2`… */
function numbered(slug: string, from: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const number = from + index
    return number === 1 ? slug : `${slug}-${number}`
  })
}

export const ApplicationSlug = {
  schema: z.string().trim().toLowerCase().min(2).max(LONGEST).regex(WORDS),
  fromName,
  numbered,
}
