import type { DB, ID, Item, Store } from './types'
import { norm } from './types'

/** Statuses that still need shopping attention on a trip list. */
const OPEN: Item['status'][] = ['needed', 'in_cart']

export const isOpen = (item: Item) => OPEN.includes(item.status)

/**
 * Items to shop at a specific store location: pinned there, or flexible with
 * a matching chain name (case-insensitive). Parked items are excluded from
 * trip lists but survive everywhere else (D7).
 */
export function itemsForStore(db: DB, store: Store): Item[] {
  return db.items.filter((it) => {
    if (!isOpen(it)) return false
    if (it.pinned_store_id) return it.pinned_store_id === store.id
    return norm(it.store_name) === norm(store.name)
  })
}

export function aisleFor(db: DB, storeId: ID, itemName: string): string | null {
  return db.aisles.find((a) => a.store_id === storeId && a.item_name === norm(itemName))?.code ?? null
}

/**
 * Natural sort key for aisle codes: "G37" → ["g",37], "A11B1" → ["a",11,"b",1],
 * bare numbers ("6", "112") sort numerically.
 */
export function aisleKey(code: string): (string | number)[] {
  const parts = code.match(/\d+|[a-zA-Z]+/g) ?? [code]
  return parts.map((p) => (/^\d+$/.test(p) ? Number(p) : p.toLowerCase()))
}

function compareKeys(a: (string | number)[], b: (string | number)[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]
    const y = b[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    // numbers sort before letters at the same position (aisle 6 < aisle G3)
    if (typeof x === 'number' && typeof y === 'number') return x - y
    if (typeof x === 'number') return -1
    if (typeof y === 'number') return 1
    return x < y ? -1 : 1
  }
  return 0
}

/**
 * In-store checklist order (D9): by aisle code, no-code items grouped at the
 * end; heat-safe before perishable as tie-break; then name.
 */
export function sortForStore(db: DB, store: Store, items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const ca = aisleFor(db, store.id, a.name)
    const cb = aisleFor(db, store.id, b.name)
    if (!!ca !== !!cb) return ca ? -1 : 1
    if (ca && cb) {
      const cmp = compareKeys(aisleKey(ca), aisleKey(cb))
      if (cmp !== 0) return cmp
    }
    if (a.heat_safe !== b.heat_safe) return a.heat_safe ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export interface PlannedStop {
  store: Store
  items: Item[]
  perishableCount: number
}

/**
 * Assemble a city run (D10): every store in the city with open items,
 * ordered heat-safe-only stops first, perishable-heavy last.
 */
export function assembleRun(db: DB, cityId: ID): PlannedStop[] {
  return db.stores
    .filter((s) => s.city_id === cityId)
    .map((store) => {
      const items = itemsForStore(db, store)
      return { store, items, perishableCount: items.filter((i) => !i.heat_safe).length }
    })
    .filter((s) => s.items.length > 0)
    .sort(
      (a, b) =>
        a.perishableCount - b.perishableCount ||
        a.items.length - b.items.length ||
        a.store.name.localeCompare(b.store.name),
    )
}

export const storeById = (db: DB, id: ID | null | undefined) =>
  db.stores.find((s) => s.id === id)

export const cityName = (db: DB, cityId: ID | null | undefined) =>
  db.cities.find((c) => c.id === cityId)?.name ?? null

/** "Target · Kona" style label for a store location. */
export function storeLabel(db: DB, store: Store): string {
  const city = cityName(db, store.city_id)
  return city ? `${store.name} · ${city}` : store.name
}

export const memberName = (db: DB, memberId: ID | null) =>
  db.members.find((m) => m.id === memberId)?.name ?? null

/** Pending returns that should surface when a trip includes this store. */
export const pendingReturnsForStore = (db: DB, storeId: ID) =>
  db.returns.filter((r) => r.store_id === storeId && r.status === 'pending')

export const activeTrip = (db: DB) =>
  db.trips.find((t) => t.status === 'active') ?? null
