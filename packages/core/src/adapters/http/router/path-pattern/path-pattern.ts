export type Segment = { kind: 'static', value: string } | { kind: 'param', name: string } | { kind: 'rest' }

export class PathPattern {

  readonly segments: Segment[]
  readonly names: string[]
  readonly shape: string

  constructor(readonly path: string) {
    if (path !== '' && !path.startsWith('/')) {
      throw new Error(`A path begins with '/', or is '': ${path}`)
    }
    const parts = path === '' ? [] : path.split('/').slice(1)
    this.segments = parts.map((part, i): Segment => {
      if (part === '*') {
        if (i !== parts.length - 1) {
          throw new Error(`A path has '*' only at its end: ${path}`)
        }
        return { kind: 'rest' }
      }
      return part.startsWith(':') ? { kind: 'param', name: part.slice(1) } : { kind: 'static', value: part }
    })
    this.names = this.segments.flatMap(segment => (segment.kind === 'param' ? [segment.name] : []))
    this.shape = this.segments.map(segment => (segment.kind === 'static' ? segment.value : segment.kind === 'param' ? ':' : '*')).map(part => `/${part}`).join('')
  }

  match(parts: string[]): string[] | null {
    const values: string[] = []
    for (const [i, segment] of this.segments.entries()) {
      if (segment.kind === 'rest') {
        return i < parts.length ? values : null
      }
      const part = parts[i]
      if (part === undefined || (segment.kind === 'static' && part !== segment.value) || (segment.kind === 'param' && part === '')) {
        return null
      }
      if (segment.kind === 'param') {
        values.push(part)
      }
    }
    return parts.length === this.segments.length ? values : null
  }

  outranks(other: PathPattern): boolean {
    const rank = { static: 0, param: 1, rest: 2 }
    for (let i = 0; i < Math.max(this.segments.length, other.segments.length); i++) {
      const mine = this.segments[i]
      const theirs = other.segments[i]
      if (!mine || !theirs) {
        return !theirs
      }
      if (rank[mine.kind] !== rank[theirs.kind]) {
        return rank[mine.kind] < rank[theirs.kind]
      }
    }
    return false
  }
}

export function partsOf(pathname: string): string[] | null {
  try {
    return pathname.split('/').slice(1).map(decodeURIComponent)
  } catch {
    return null
  }
}
