import { renderMermaidSVG } from 'beautiful-mermaid'
import { visit } from 'unist-util-visit'

/**
 * Turns ```mermaid blocks into SVG at build time (beautiful-mermaid): no script on the page, and
 * the colours are the site's variables, so light and dark switch without drawing again.
 * The site's --muted, --accent and --border are background colours; each is set here so the
 * diagram does not pick them up.
 */
const colors = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  line: 'color-mix(in srgb, var(--foreground) 40%, var(--background))',
  accent: 'var(--brand)',
  muted: 'var(--muted-foreground)',
  surface: 'color-mix(in srgb, var(--foreground) 4%, var(--background))',
  border: 'color-mix(in srgb, var(--foreground) 22%, var(--background))',
  font: 'Poppins',
  transparent: true,
}

export function remarkDiagrams() {
  return (tree, file) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return
      let svg
      try {
        svg = renderMermaidSVG(node.value, colors)
      } catch (error) {
        throw new Error(`Mermaid diagram in ${file.path}: ${error.message}`)
      }
      svg = svg.replace(/@import url\([^)]*\);\s*/, '')
      parent.children[index] = { type: 'html', value: `<figure class="diagram">${svg}</figure>` }
    })
  }
}
