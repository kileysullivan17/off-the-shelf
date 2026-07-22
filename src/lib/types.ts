// Core domain model. Mirrors supabase/schema.sql — keep the two in sync.

export type ID = string

export type ItemStatus =
  | 'needed'
  | 'in_cart'
  | 'bought'
  | 'out_of_stock'
  | 'substituted'
  | 'moved'
  | 'parked'

export interface Island {
  id: ID
  name: string
}

export interface City {
  id: ID
  island_id: ID
  name: string
}

/** A store is a specific location: name + city. city_id null = online (Amazon). */
export interface Store {
  id: ID
  name: string
  city_id: ID | null
  location_note: string | null
}

export interface Member {
  id: ID
  name: string
}

export interface Item {
  id: ID
  name: string
  /** Chain name the item is assigned to (flexible: any location of this name). */
  store_name: string
  /** When set, the item must be satisfied at this exact location. */
  pinned_store_id: ID | null
  category: string | null
  quantity_note: string | null
  heat_safe: boolean
  member_id: ID | null
  staple: boolean
  photo: string | null
  instruction_note: string | null
  photo_requested: boolean
  status: ItemStatus
  added_at: string
}

/** Learned aisle code for an item name at a specific store location. */
export interface ItemAisle {
  id: ID
  store_id: ID
  /** lowercased item name */
  item_name: string
  code: string
  confirmed_at: string
}

export interface TripStop {
  store_id: ID
  position: number
}

export interface Errand {
  id: ID
  text: string
  done: boolean
}

export interface Trip {
  id: ID
  city_id: ID
  date: string
  status: 'planned' | 'active' | 'done'
  stops: TripStop[]
  errands: Errand[]
}

export interface ReturnEntry {
  id: ID
  item_name: string
  store_id: ID
  reason: string | null
  status: 'pending' | 'done'
}

export type Reaction = 'liked' | 'disliked' | 'neutral'

export interface MemberReaction {
  member_id: ID
  reaction: Reaction
  note: string | null
}

export interface PurchaseRecord {
  id: ID
  item_name: string
  store_id: ID
  date: string
  outcome: 'bought' | 'disliked' | 'loved'
  rating: number | null
  reactions: MemberReaction[]
  aisle_code: string | null
  note: string | null
  photo: string | null
}

export interface Question {
  id: ID
  photo: string | null
  text: string
  store_id: ID | null
  /** When the question is about a specific list item (photo-requested flow). */
  item_id: ID | null
  status: 'open' | 'answered'
  answer: string | null
  created_at: string
}

/** The whole household dataset — small enough to load at once (see D5). */
export interface DB {
  islands: Island[]
  cities: City[]
  stores: Store[]
  members: Member[]
  items: Item[]
  aisles: ItemAisle[]
  trips: Trip[]
  returns: ReturnEntry[]
  purchases: PurchaseRecord[]
  questions: Question[]
}

export const uid = (): ID =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)

export const norm = (s: string) => s.trim().toLowerCase()
