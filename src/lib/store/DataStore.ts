import type {
  City, DB, ID, Item, ItemAisle, Member, PurchaseRecord, Question,
  ReturnEntry, Store, Trip,
} from '../types'

/**
 * Swappable persistence boundary (see DECISIONS.md D1/D5).
 * `load()` returns the whole household dataset; mutations are granular and
 * the UI invalidates the single query key afterwards.
 */
export interface DataStore {
  readonly mode: 'local' | 'supabase'
  load(): Promise<DB>
  upsertItem(item: Item): Promise<void>
  bulkAddItems(items: Item[]): Promise<void>
  deleteItem(id: ID): Promise<void>
  updateMember(member: Member): Promise<void>
  upsertCity(city: City): Promise<void>
  upsertStore(store: Store): Promise<void>
  upsertTrip(trip: Trip): Promise<void>
  deleteTrip(id: ID): Promise<void>
  upsertReturn(entry: ReturnEntry): Promise<void>
  addPurchase(record: PurchaseRecord): Promise<void>
  upsertQuestion(question: Question): Promise<void>
  setAisle(aisle: ItemAisle): Promise<void>
  /** Wipe and restore demo seed (local) / push seed (supabase, dev only). */
  resetToSeed(): Promise<void>
}

/**
 * Auth surface, implemented only by SupabaseStore (D19). The shared-household
 * account signs in once per device; LocalStore has no auth and is used as-is.
 */
export interface AuthCapable {
  hasSession(): Promise<boolean>
  /** Returns an error message on failure, null on success. */
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
  /** Subscribe to sign-in/out; returns an unsubscribe fn. */
  onAuthChange(cb: (signedIn: boolean) => void): () => void
  currentEmail(): Promise<string | null>
}

export function isAuthCapable(store: DataStore): store is DataStore & AuthCapable {
  return 'signIn' in store
}
