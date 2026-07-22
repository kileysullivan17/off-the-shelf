// Paste-import parser (behavior 9). Accepts the loose real-world list format:
// store name lines followed by item lines, *, -, •, x markers tolerated,
// "x 2" quantities captured, aisle codes like G37 / A11B1 recognized,
// (parenthetical instructions) kept as the instruction note.
// Parse generously; never throw on messy input — worst case a line becomes
// a plain item name or is skipped when empty.

export interface ParsedLine {
  name: string
  store_name: string | null
  quantity_note: string | null
  aisle_code: string | null
  instruction_note: string | null
  raw: string
}

/** Common shorthand seen in real household lists. */
const STORE_ALIASES: Record<string, string> = {
  hd: 'Home Depot',
  'home depot': 'Home Depot',
  wm: 'Walmart',
  oreilly: "O'Reilly",
  "o'reilly": "O'Reilly",
  oreillys: "O'Reilly",
}

const squash = (s: string) =>
  s.toLowerCase().replace(/[''`.]/g, '').replace(/\s+/g, ' ').trim()

/** Leading list markers: bullets, dashes, checkboxes, a bare crossed-off "x". */
const stripMarkers = (line: string) =>
  line.replace(/^[\s*\-•·>+]+/, '').replace(/^\[[ xX]?\]\s*/, '').replace(/^x\s+(?=\D)/i, '').trim()

function matchStore(line: string, knownStores: string[]): string | null {
  const cleaned = squash(stripMarkers(line).replace(/[:\-–]+$/, ''))
  if (!cleaned) return null
  if (STORE_ALIASES[cleaned]) return STORE_ALIASES[cleaned]
  const hit = knownStores.find((s) => squash(s) === cleaned)
  if (hit) return hit
  // "KTA:" — trailing colon marks an intentional store header even if unknown
  if (/[:]\s*$/.test(stripMarkers(line)) && cleaned.length <= 30) {
    const title = stripMarkers(line).replace(/[:\s]+$/, '')
    return title
  }
  return null
}

/** Aisle-code shaped token: G37, A11B1, B15, E12 — uppercase letters+digits. */
const AISLE_RE = /(?:^|\s)([A-Z]{1,2}\d{1,3}(?:[A-Z]\d{1,3})?)(?=\s|$)/

/** Trailing/inline quantity: "x 2", "x2", "×3". */
const QTY_RE = /(?:^|\s)[x×]\s?(\d{1,3})(?=\s|$)/i

export function parseImport(text: string, knownStores: string[]): ParsedLine[] {
  const out: ParsedLine[] = []
  let currentStore: string | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim()
    if (!raw) continue

    const store = matchStore(raw, knownStores)
    if (store) {
      currentStore = store
      continue
    }

    let rest = stripMarkers(raw)
    if (!rest) continue

    // (parenthetical instructions) — may be several, join them
    const notes: string[] = []
    rest = rest.replace(/\(([^)]*)\)/g, (_, note: string) => {
      const trimmed = note.trim()
      if (trimmed) notes.push(trimmed)
      return ' '
    })

    let quantity: string | null = null
    rest = rest.replace(QTY_RE, (_, n: string) => {
      quantity = `x ${n}`
      return ' '
    })

    let aisle: string | null = null
    rest = rest.replace(AISLE_RE, (_, code: string) => {
      aisle = code
      return ' '
    })

    const name = rest.replace(/\s+/g, ' ').replace(/[,;]+$/, '').trim()
    if (!name) continue

    out.push({
      name,
      store_name: currentStore,
      quantity_note: quantity,
      aisle_code: aisle,
      instruction_note: notes.length ? notes.join('; ') : null,
      raw,
    })
  }
  return out
}
