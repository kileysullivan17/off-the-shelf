// Demo-scenario checks against the real seed: the Kona run heat-safe stop
// ordering and the aisle-sorted Hilo Target list from the definition of done.
import { describe, expect, it } from 'vitest'
import { seedDB } from './seed'
import { aisleKey, assembleRun, itemsForStore, sortForStore } from './tripLogic'

const db = seedDB()

describe('assembleRun — Kona', () => {
  it('orders heat-safe-only stops first, perishable-heavy last', () => {
    const stops = assembleRun(db, 'city-kona')
    expect(stops.length).toBeGreaterThanOrEqual(3)
    expect(stops[0].store.id).toBe('st-kona-hd') // all heat-safe hardware
    expect(stops[0].perishableCount).toBe(0)
    expect(stops.at(-1)!.store.id).toBe('st-kona-costco') // milk, chicken, berries…
    // perishable counts never decrease along the run
    const counts = stops.map((s) => s.perishableCount)
    expect([...counts].sort((a, b) => a - b)).toEqual(counts)
  })

  it('flexible items land at every matching location, pinned only at theirs', () => {
    const konaTarget = db.stores.find((s) => s.id === 'st-kona-target')!
    const hiloTarget = db.stores.find((s) => s.id === 'st-hilo-target')!
    const konaNames = itemsForStore(db, konaTarget).map((i) => i.name)
    const hiloNames = itemsForStore(db, hiloTarget).map((i) => i.name)
    expect(konaNames).toContain('Bagels') // flexible: any Target
    expect(hiloNames).toContain('Bagels')
    expect(konaNames).toContain('Beach towels') // pinned to Kona
    expect(hiloNames).not.toContain('Beach towels')
    expect(hiloNames).toContain('Bibs') // pinned to Hilo
    expect(konaNames).not.toContain('Bibs')
  })
})

describe('sortForStore — Hilo Target', () => {
  it('sorts by aisle code with no-code items grouped at the end', () => {
    const store = db.stores.find((s) => s.id === 'st-hilo-target')!
    const sorted = sortForStore(db, store, itemsForStore(db, store))
    const codes = sorted.map(
      (i) => db.aisles.find((a) => a.store_id === store.id && a.item_name === i.name.toLowerCase())?.code ?? null,
    )
    const firstNull = codes.indexOf(null)
    // every coded item comes before every uncoded one
    expect(codes.slice(0, firstNull === -1 ? codes.length : firstNull).every(Boolean)).toBe(true)
    if (firstNull !== -1) expect(codes.slice(firstNull).every((c) => c === null)).toBe(true)
    // A11B1 (sunscreen) before B15 (batteries) before C2 (bagels) before G37 (bibs)
    const order = ['Sunscreen', 'AA batteries', 'Bagels', 'Greek yogurt', 'Bibs']
    const positions = order.map((n) => sorted.findIndex((i) => i.name === n))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })
})

describe('aisleKey', () => {
  it('natural-sorts codes', () => {
    expect(aisleKey('G37')).toEqual(['g', 37])
    expect(aisleKey('A11B1')).toEqual(['a', 11, 'b', 1])
    expect(aisleKey('112')).toEqual([112])
  })
})
