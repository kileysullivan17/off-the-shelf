import type {
  City, DB, ID, Item, ItemAisle, Member, PurchaseRecord, Question,
  ReturnEntry, Store, Trip,
} from '../types'
import { seedDB } from '../seed'
import type { DataStore } from './DataStore'

const KEY = 'island-shopping-db-v1'

/** localStorage-backed adapter: the offline/demo mode of the app (D1). */
export class LocalStore implements DataStore {
  readonly mode = 'local' as const

  private read(): DB {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const db = seedDB()
      this.write(db)
      return db
    }
    return JSON.parse(raw) as DB
  }

  private write(db: DB) {
    localStorage.setItem(KEY, JSON.stringify(db))
  }

  private mutate(fn: (db: DB) => void): Promise<void> {
    const db = this.read()
    fn(db)
    this.write(db)
    return Promise.resolve()
  }

  private static upsert<T extends { id: ID }>(list: T[], row: T) {
    const i = list.findIndex((r) => r.id === row.id)
    if (i >= 0) list[i] = row
    else list.push(row)
  }

  load(): Promise<DB> {
    return Promise.resolve(this.read())
  }

  upsertItem(item: Item) {
    return this.mutate((db) => LocalStore.upsert(db.items, item))
  }

  bulkAddItems(items: Item[]) {
    return this.mutate((db) => items.forEach((it) => LocalStore.upsert(db.items, it)))
  }

  deleteItem(id: ID) {
    return this.mutate((db) => {
      db.items = db.items.filter((i) => i.id !== id)
    })
  }

  updateMember(member: Member) {
    return this.mutate((db) => LocalStore.upsert(db.members, member))
  }

  upsertCity(city: City) {
    return this.mutate((db) => LocalStore.upsert(db.cities, city))
  }

  upsertStore(store: Store) {
    return this.mutate((db) => LocalStore.upsert(db.stores, store))
  }

  upsertTrip(trip: Trip) {
    return this.mutate((db) => LocalStore.upsert(db.trips, trip))
  }

  deleteTrip(id: ID) {
    return this.mutate((db) => {
      db.trips = db.trips.filter((t) => t.id !== id)
    })
  }

  upsertReturn(entry: ReturnEntry) {
    return this.mutate((db) => LocalStore.upsert(db.returns, entry))
  }

  addPurchase(record: PurchaseRecord) {
    return this.mutate((db) => LocalStore.upsert(db.purchases, record))
  }

  upsertQuestion(question: Question) {
    return this.mutate((db) => LocalStore.upsert(db.questions, question))
  }

  setAisle(aisle: ItemAisle) {
    return this.mutate((db) => {
      // one code per (store, item name) — replace any existing row
      db.aisles = db.aisles.filter(
        (a) => !(a.store_id === aisle.store_id && a.item_name === aisle.item_name),
      )
      db.aisles.push(aisle)
    })
  }

  resetToSeed() {
    this.write(seedDB())
    return Promise.resolve()
  }
}
