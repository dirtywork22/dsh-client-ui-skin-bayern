/**
 * Codemod: win the cascade against dsh's own dark palette.
 *
 * dsh defines its light tokens on `body{...}` (specificity 0,0,1) but its dark
 * tokens on `body[data-ds-dark-theme]{...}` (0,1,1) — exactly the specificity of
 * our `body[data-dsh-bayern]{...}`. A tie loses to whichever stylesheet comes
 * later, and in dark mode that is dsh, so the translucent canvas was replaced by
 * an opaque one and the photo backdrop disappeared (light mode kept working
 * because there the tie is in our favour).
 *
 * Fix: qualify every one of our rules with `html ` (0,2,1 — beats any bare
 * body-selector rule), and pin the four surface tokens that must stay
 * translucent with !important.
 *
 * Usage: node tools/patch-cascade.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'lib/client.js')
let src = readFileSync(file, 'utf8')

/* ---- 1. specificity: every CSS rule line that starts with body[data-dsh-bayern] */
const before = (src.match(/'body\[data-dsh-bayern\]/g) || []).length
src = src.replace(/'body\[data-dsh-bayern\]/g, "'html body[data-dsh-bayern]")
const after = (src.match(/'html body\[data-dsh-bayern\]/g) || []).length
console.log(`qualified ${before} rule selectors with html (now ${after})`)

/* ---- 2. !important on the surface tokens that must stay translucent ---------- */
const pinned = [
  '--dsw-alias-bg-base',
  '--dsw-specific-sidebar-fill',
  '--dsw-specific-input-major',
  '--dsw-specific-bubble'
]
let pinnedCount = 0
for (const token of pinned) {
  const escaped = token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const pattern = new RegExp(`'(\\s*${escaped}: [^']*?)',`, 'g')
  src = src.replace(pattern, (match, declaration) => {
    pinnedCount += 1
    return `'${declaration.replace(/;?\s*$/, '')} !important;',`
  })
}
console.log(`pinned ${pinnedCount} token declarations with !important`)

writeFileSync(file, src)
console.log('cascade patch applied;', (src.length / 1024).toFixed(0), 'KB')
