import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  City, DB, ID, Item, ItemAisle, Member, PurchaseRecord, Question,
  ReturnEntry, Store, Trip,
} from '../types'
import { seedDB } from '../seed'
import type { AuthCapable, DataStore } from './DataStore'

/**
 * Real Supabase adapter. Activated when VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set (see README). Table shapes live in
 * supabase/schema.sql; trips/purchases use jsonb for stops/errands/reactions
 * so rows map 1:1 onto the TS types.
 */
export class SupabaseStore implements DataStore, AuthCapable {
  readonly mode = 'supabase' as const
  private sb: SupabaseClient

  constructor(url: string, anonKey: string) {
    // persistSession (default) keeps the household login in localStorage, so
    // each device signs in once (D19).
    this.sb = createClient(url, anonKey, {
      auth: {
        // The default navigator.locks-based lock can deadlock on some mobile /
        // PWA browsers, leaving signInWithPassword hanging with no error and the
        // SIGNED_IN event never firing. We run a single shared account with no
        // cross-tab refresh contention, so a pass-through lock is safe and
        // removes that entire class of hang. (D20)
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    })
  }

  // ---- auth (shared household account) -------------------------------------
  async hasSession(): Promise<boolean> {
    const { data } = await this.sb.auth.getSession()
    return !!data.session
  }

  async signIn(email: string, password: string): Promise<string | null> {
    try {
      const { error } = await this.sb.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    } catch (e) {
      // A thrown (rather than returned) error — network/storage failure — must
      // surface as a message so the login button never hangs silently.
      return e instanceof Error ? e.message : 'Sign-in failed. Check your connection and try again.'
    }
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut()
  }

  onAuthChange(cb: (signedIn: boolean) => void): () => void {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => cb(!!session))
    return () => data.subscription.unsubscribe()
  }

  async currentEmail(): Promise<string | null> {
    const { data } = await this.sb.auth.getUser()
    return data.user?.email ?? null
  }

  private async all<T>(table: string): Promise<T[]> {
    const { data, error } = await this.sb.from(table).select('*')
    if (error) throw error
    return (data ?? []) as T[]
  }

  private async up(table: string, row: object): Promise<void> {
    const { error } = await this.sb.from(table).upsert(row)
    if (error) throw error
  }

  private async del(table: string, id: ID): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq('id', id)
    if (error) throw error
  }

  async load(): Promise<DB> {
    const [islands, cities, stores, members, items, aisles, trips, returns, purchases, questions] =
      await Promise.all([
        this.all<DB['islands'][number]>('islands'),
        this.all<City>('cities'),
        this.all<Store>('stores'),
        this.all<Member>('members'),
        this.all<Item>('items'),
        this.all<ItemAisle>('item_aisles'),
        this.all<Trip>('trips'),
        this.all<ReturnEntry>('returns'),
        this.all<PurchaseRecord>('purchases'),
        this.all<Question>('questions'),
      ])
    return { islands, cities, stores, members, items, aisles, trips, returns, purchases, questions }
  }

  upsertItem(item: Item) { return this.up('items', item) }
  bulkAddItems(items: Item[]) { return this.up('items', items as unknown as object) }
  deleteItem(id: ID) { return this.del('items', id) }
  updateMember(member: Member) { return this.up('members', member) }
  upsertCity(city: City) { return this.up('cities', city) }
  upsertStore(store: Store) { return this.up('stores', store) }
  upsertTrip(trip: Trip) { return this.up('trips', trip) }
  deleteTrip(id: ID) { return this.del('trips', id) }
  upsertReturn(entry: ReturnEntry) { return this.up('returns', entry) }
  addPurchase(record: PurchaseRecord) { return this.up('purchases', record) }
  upsertQuestion(question: Question) { return this.up('questions', question) }

  async setAisle(aisle: ItemAisle): Promise<void> {
    const { error } = await this.sb
      .from('item_aisles')
      .upsert(aisle, { onConflict: 'store_id,item_name' })
    if (error) throw error
  }

  /** Dev-only: push the demo seed into an empty project (D14). */
  async resetToSeed(): Promise<void> {
    const seed = seedDB()
    // Schema uses text PKs (D17) so the readable seed ids push as-is.
    await this.up('islands', seed.islands)
    await this.up('cities', seed.cities)
    await this.up('stores', seed.stores)
    await this.up('members', seed.members)
    await this.up('items', seed.items)
    await this.up('item_aisles', seed.aisles)
    await this.up('returns', seed.returns)
    await this.up('purchases', seed.purchases)
    await this.up('questions', seed.questions)
  }
}
