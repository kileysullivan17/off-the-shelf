// WCAG contrast audit for the Off the Shelf cool-violet tokens.
// Reads --color-* values straight from src/index.css so the table can't
// drift from the app, then checks every text pair the UI actually uses.
// AA (4.5:1) minimum everywhere; checklist/trip text must hit AAA (7:1)
// for bright-store legibility. Run: npm run contrast
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const tokens = {}
for (const [, name, hex] of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  tokens[name] = hex.toLowerCase()
}

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// [fg token, bg token, minimum ratio, where it's used]
const pairs = [
  ['ink', 'paper', 7, 'checklist rows, titles (AAA — bright store)'],
  ['ink', 'tint', 7, 'section band labels'],
  ['ink', 'chip', 7, 'aisle/code chips'],
  ['ink', 'highlight', 7, 'note highlight text'],
  ['ink-soft', 'paper', 4.5, 'meta text'],
  ['ink-soft', 'tint', 4.5, 'meta on bands'],
  ['ink-mute', 'paper', 4.5, 'decorative meta'],
  ['paper', 'ink', 7, 'text on dark bars/pills'],
  ['lavender', 'ink', 4.5, 'accent text on ink surfaces'],
  ['violet-deep', 'paper', 7, 'violet as status ink / links'],
  ['violet-deep', 'violet-tint', 4.5, 'in-cart chip text'],
  ['paper', 'violet', 4.5, 'white text on violet button'],
  ['magenta-ink', 'paper', 4.5, 'review flag text'],
  ['magenta-ink', 'magenta-tint', 4.5, 'REVIEW? chip'],
  ['paper', 'magenta', 3, 'gradient tail under bold 13px+ text'],
  ['bought', 'paper', 7, 'bought status ink'],
  ['bought', 'bought-tint', 4.5, 'bought chip'],
  ['paper', 'bought', 4.5, 'check glyph on green fill'],
  ['danger', 'paper', 7, 'out-of-stock ink'],
  ['danger', 'danger-tint', 4.5, 'OUT chip'],
  ['paper', 'danger', 4.5, 'glyph on danger fill'],
  ['sub', 'paper', 7, 'substituted ink'],
  ['sub', 'sub-tint', 4.5, "SUB'D chip"],
  ['paper', 'sub', 4.5, 'glyph on sub fill'],
  ['moved', 'paper', 7, 'moved ink'],
  ['moved', 'moved-tint', 4.5, 'destination chip'],
  ['paper', 'moved', 4.5, 'glyph on moved fill'],
  ['parked', 'paper', 4.5, 'parked ink (dimmed rows)'],
  ['parked', 'parked-tint', 4.5, 'PARKED chip'],
  ['amber', 'paper', 4.5, 'heat marker text'],
  ['amber', 'amber-tint', 4.5, 'sun/heat chip'],
]

let failed = 0
const rows = pairs.map(([fg, bg, min, use]) => {
  if (!tokens[fg] || !tokens[bg]) {
    failed++
    return { fg, bg, min, use, r: NaN, ok: false }
  }
  const r = ratio(tokens[fg], tokens[bg])
  const ok = r >= min
  if (!ok) failed++
  return { fg, bg, min, use, r, ok }
})

console.log('CONTRAST AUDIT — Off the Shelf cool-violet tokens\n')
console.log(
  ['pair'.padEnd(30), 'ratio'.padStart(7), 'min'.padStart(6), '  ', 'use'].join(''),
)
for (const { fg, bg, min, use, r, ok } of rows) {
  console.log(
    [
      `${fg} on ${bg}`.padEnd(30),
      (Number.isNaN(r) ? 'MISSING' : r.toFixed(2) + ':1').padStart(7),
      `${min}:1`.padStart(6),
      ok ? '  ✓ ' : '  ✗ ',
      use,
    ].join(''),
  )
}
console.log(`\n${rows.length - failed}/${rows.length} pass`)
if (failed) {
  console.error(`\n${failed} FAILING — darken the failing stop and re-run.`)
  process.exit(1)
}
