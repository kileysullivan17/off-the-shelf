// Demo seed: placeholder members only (M1–M4), Hilo + Kona populated,
// aisle codes on some items, staples set, history deep enough that a Kona
// run, an aisle-sorted Hilo Target list, and the ramen scenario all demo.
import type { DB, Item, PurchaseRecord } from './types'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const svgPhoto = (emoji: string, bg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${bg}"/><text x="120" y="140" font-size="96" text-anchor="middle">${emoji}</text></svg>`,
  )}`

// ---- geography ------------------------------------------------------------
const islands = [
  { id: 'isl-hawaii', name: 'Hawaii Island' },
  { id: 'isl-oahu', name: 'Oahu' },
]

const cities = [
  { id: 'city-hilo', island_id: 'isl-hawaii', name: 'Hilo' },
  { id: 'city-keaau', island_id: 'isl-hawaii', name: "Kea'au" },
  { id: 'city-kona', island_id: 'isl-hawaii', name: 'Kona' },
]

const stores = [
  { id: 'st-hilo-target', name: 'Target', city_id: 'city-hilo', location_note: null },
  { id: 'st-hilo-daiso', name: 'Daiso', city_id: 'city-hilo', location_note: null },
  { id: 'st-hilo-hd', name: 'Home Depot', city_id: 'city-hilo', location_note: null },
  { id: 'st-hilo-kta', name: 'KTA', city_id: 'city-hilo', location_note: 'Puainako' },
  { id: 'st-hilo-oreilly', name: "O'Reilly", city_id: 'city-hilo', location_note: null },
  { id: 'st-hilo-walmart', name: 'Walmart', city_id: 'city-hilo', location_note: null },
  { id: 'st-hilo-ross', name: 'Ross', city_id: 'city-hilo', location_note: null },
  { id: 'st-keaau-longs', name: 'Longs', city_id: 'city-keaau', location_note: null },
  { id: 'st-kona-hd', name: 'Home Depot', city_id: 'city-kona', location_note: null },
  { id: 'st-kona-target', name: 'Target', city_id: 'city-kona', location_note: null },
  { id: 'st-kona-costco', name: 'Costco', city_id: 'city-kona', location_note: null },
  { id: 'st-amazon', name: 'Amazon', city_id: null, location_note: 'online standing list' },
]

// ---- household ------------------------------------------------------------
const members = [
  { id: 'm1', name: 'M1' },
  { id: 'm2', name: 'M2' },
  { id: 'm3', name: 'M3' },
  { id: 'm4', name: 'M4' },
]

// ---- items ----------------------------------------------------------------
const item = (partial: Partial<Item> & Pick<Item, 'id' | 'name' | 'store_name'>): Item => ({
  pinned_store_id: null,
  category: null,
  quantity_note: null,
  heat_safe: false,
  member_id: null,
  staple: false,
  photo: null,
  instruction_note: null,
  photo_requested: false,
  status: 'needed',
  added_at: daysAgo(2),
  ...partial,
})

const items: Item[] = [
  // --- staples (the one-tap re-add set; several currently satisfied) -------
  item({ id: 'it-poi', name: 'Poi', store_name: 'KTA', staple: true, category: 'grocery', instruction_note: 'fresh if they have it', status: 'needed' }),
  item({ id: 'it-bagels', name: 'Bagels', store_name: 'Target', staple: true, category: 'grocery', heat_safe: true, status: 'needed' }),
  item({ id: 'it-sweetbread', name: 'Sweet bread', store_name: 'KTA', staple: true, category: 'grocery', heat_safe: true, status: 'bought' }),
  item({ id: 'it-milk-m1', name: 'Whole milk', store_name: 'Costco', staple: true, category: 'dairy', member_id: 'm1', quantity_note: 'x 2', status: 'needed' }),
  item({ id: 'it-milk-m2', name: 'Oat milk', store_name: 'Target', staple: true, category: 'dairy', member_id: 'm2', instruction_note: 'Oatly if not expensive', status: 'needed' }),
  item({ id: 'it-milk-m3', name: '2% milk', store_name: 'KTA', staple: true, category: 'dairy', member_id: 'm3', status: 'bought' }),
  item({ id: 'it-milk-m4', name: 'Chocolate milk', store_name: 'KTA', staple: true, category: 'dairy', member_id: 'm4', instruction_note: 'small bottles', status: 'parked' }),
  item({ id: 'it-mushroom-coffee', name: 'Mushroom coffee', store_name: 'Amazon', staple: true, category: 'pantry', heat_safe: true, status: 'needed' }),

  // --- Hilo Target (aisle-sorted list demo) --------------------------------
  item({ id: 'it-bibs', name: 'Bibs', store_name: 'Target', pinned_store_id: 'st-hilo-target', member_id: 'm4', heat_safe: true, category: 'baby' }),
  item({ id: 'it-sunscreen', name: 'Sunscreen', store_name: 'Target', heat_safe: true, category: 'personal', instruction_note: 'reef-safe only' }),
  item({ id: 'it-tshirts', name: 'Kids t-shirts', store_name: 'Target', member_id: 'm3', heat_safe: true, category: 'clothes', quantity_note: 'x 3', photo_requested: true, instruction_note: 'send pic of designs before buying' }),
  item({ id: 'it-yogurt', name: 'Greek yogurt', store_name: 'Target', category: 'dairy', quantity_note: 'x 2', instruction_note: 'check expiration' }),
  item({ id: 'it-batteries', name: 'AA batteries', store_name: 'Target', heat_safe: true, category: 'household' }),

  // --- KTA Hilo -------------------------------------------------------------
  item({ id: 'it-ramen', name: 'Ramen', store_name: 'KTA', heat_safe: true, category: 'pantry', quantity_note: 'x 4', instruction_note: 'NOT the spicy one — check history', member_id: 'm3' }),
  item({ id: 'it-saloon', name: 'Saloon Pilot crackers', store_name: 'KTA', heat_safe: true, category: 'pantry' }),
  item({ id: 'it-ahi', name: 'Ahi steaks', store_name: 'KTA', category: 'grocery', instruction_note: 'only if fresh, not previously frozen' }),

  // --- Hilo other stores ----------------------------------------------------
  item({ id: 'it-organizers', name: 'Drawer organizers', store_name: 'Daiso', heat_safe: true, category: 'household', quantity_note: 'x 6' }),
  item({ id: 'it-wiper', name: 'Wiper blades', store_name: "O'Reilly", heat_safe: true, category: 'auto', instruction_note: '2019 Sienna, driver side' }),
  item({ id: 'it-slippers', name: 'Kids slippers', store_name: 'Ross', member_id: 'm4', heat_safe: true, category: 'clothes' }),

  // --- Kona run demo --------------------------------------------------------
  item({ id: 'it-zipties', name: 'Zip ties', store_name: 'Home Depot', heat_safe: true, category: 'hardware' }),
  item({ id: 'it-hose', name: 'Hose washers', store_name: 'Home Depot', heat_safe: true, category: 'hardware', quantity_note: 'x 2 packs' }),
  item({ id: 'it-shelf', name: 'Wire shelf brackets', store_name: 'Home Depot', pinned_store_id: 'st-kona-hd', heat_safe: true, category: 'hardware', instruction_note: '12", the gray ones' }),
  item({ id: 'it-beach-towels', name: 'Beach towels', store_name: 'Target', pinned_store_id: 'st-kona-target', heat_safe: true, quantity_note: 'x 2', category: 'household' }),
  item({ id: 'it-goggles', name: 'Swim goggles', store_name: 'Target', pinned_store_id: 'st-kona-target', member_id: 'm3', heat_safe: true, category: 'kids' }),
  item({ id: 'it-string-cheese', name: 'String cheese', store_name: 'Target', pinned_store_id: 'st-kona-target', member_id: 'm4', category: 'dairy' }),
  item({ id: 'it-chicken', name: 'Chicken thighs', store_name: 'Costco', category: 'grocery', quantity_note: 'big pack, split & freeze' }),
  item({ id: 'it-berries', name: 'Frozen berries', store_name: 'Costco', category: 'frozen' }),
  item({ id: 'it-spam', name: 'Spam', store_name: 'Costco', heat_safe: true, category: 'pantry', quantity_note: '8-pack' }),
  item({ id: 'it-rice', name: 'Calrose rice 25lb', store_name: 'Costco', heat_safe: true, category: 'pantry' }),
  item({ id: 'it-rotisserie', name: 'Rotisserie chicken', store_name: 'Costco', category: 'grocery', instruction_note: 'grab last, right before checkout' }),

  // --- Kea'au ----------------------------------------------------------------
  item({ id: 'it-claritin', name: 'Claritin', store_name: 'Longs', heat_safe: true, category: 'pharmacy', member_id: 'm2' }),

  // --- Amazon standing list ---------------------------------------------------
  item({ id: 'it-waterfilter', name: 'Fridge water filter', store_name: 'Amazon', heat_safe: true, category: 'household' }),
  item({ id: 'it-earbuds', name: 'Kids headphones', store_name: 'Amazon', member_id: 'm3', heat_safe: true, category: 'electronics' }),
]

// ---- learned aisle codes ----------------------------------------------------
const aisles = [
  { id: 'ai-1', store_id: 'st-hilo-target', item_name: 'bibs', code: 'G37', confirmed_at: daysAgo(30) },
  { id: 'ai-2', store_id: 'st-hilo-target', item_name: 'sunscreen', code: 'A11B1', confirmed_at: daysAgo(21) },
  { id: 'ai-3', store_id: 'st-hilo-target', item_name: 'greek yogurt', code: 'C4', confirmed_at: daysAgo(14) },
  { id: 'ai-4', store_id: 'st-hilo-target', item_name: 'bagels', code: 'C2', confirmed_at: daysAgo(14) },
  { id: 'ai-5', store_id: 'st-hilo-target', item_name: 'aa batteries', code: 'B15', confirmed_at: daysAgo(60) },
  { id: 'ai-6', store_id: 'st-hilo-kta', item_name: 'ramen', code: '6', confirmed_at: daysAgo(45) },
  { id: 'ai-7', store_id: 'st-hilo-kta', item_name: 'poi', code: '1', confirmed_at: daysAgo(10) },
  { id: 'ai-8', store_id: 'st-hilo-kta', item_name: 'saloon pilot crackers', code: '5', confirmed_at: daysAgo(45) },
  { id: 'ai-9', store_id: 'st-kona-hd', item_name: 'zip ties', code: 'E12', confirmed_at: daysAgo(90) },
  { id: 'ai-10', store_id: 'st-kona-costco', item_name: 'spam', code: '112', confirmed_at: daysAgo(30) },
]

// ---- purchase memory (the ramen scenario + staples history) -----------------
const purchase = (
  p: Partial<PurchaseRecord> & Pick<PurchaseRecord, 'id' | 'item_name' | 'store_id' | 'date' | 'outcome'>,
): PurchaseRecord => ({ rating: null, reactions: [], aisle_code: null, note: null, photo: null, ...p })

const purchases: PurchaseRecord[] = [
  // Ramen: what was tried, when, where, who liked what.
  purchase({
    id: 'pu-ramen-1', item_name: 'Ramen', store_id: 'st-hilo-kta', date: daysAgo(120), outcome: 'disliked',
    rating: 2, note: 'Shin Ramyun — way too spicy for the kids', aisle_code: '6',
    reactions: [
      { member_id: 'm3', reaction: 'disliked', note: "M3 doesn't like this one — too spicy" },
      { member_id: 'm1', reaction: 'liked', note: null },
    ],
  }),
  purchase({
    id: 'pu-ramen-2', item_name: 'Ramen', store_id: 'st-hilo-kta', date: daysAgo(90), outcome: 'loved',
    rating: 5, note: 'Sapporo Ichiban original — the winner', aisle_code: '6',
    reactions: [
      { member_id: 'm3', reaction: 'liked', note: 'asked for it again' },
      { member_id: 'm4', reaction: 'liked', note: null },
    ],
  }),
  purchase({
    id: 'pu-ramen-3', item_name: 'Ramen', store_id: 'st-kona-costco', date: daysAgo(60), outcome: 'bought',
    rating: 3, note: 'Tonkotsu 12-pack — fine, a bit rich',
    reactions: [{ member_id: 'm2', reaction: 'neutral', note: null }],
  }),
  purchase({
    id: 'pu-ramen-4', item_name: 'Ramen', store_id: 'st-hilo-kta', date: daysAgo(30), outcome: 'disliked',
    rating: 1, note: 'Maruchan chicken — mushy noodles',
    reactions: [{ member_id: 'm3', reaction: 'disliked', note: null }, { member_id: 'm4', reaction: 'disliked', note: 'left the bowl' }],
  }),
  // Staples & general history.
  purchase({ id: 'pu-poi-1', item_name: 'Poi', store_id: 'st-hilo-kta', date: daysAgo(10), outcome: 'loved', rating: 5, aisle_code: '1', reactions: [{ member_id: 'm4', reaction: 'liked', note: null }] }),
  purchase({ id: 'pu-poi-2', item_name: 'Poi', store_id: 'st-hilo-kta', date: daysAgo(24), outcome: 'bought', rating: 4, reactions: [] }),
  purchase({ id: 'pu-bagel-1', item_name: 'Bagels', store_id: 'st-hilo-target', date: daysAgo(14), outcome: 'bought', rating: 4, aisle_code: 'C2', reactions: [{ member_id: 'm2', reaction: 'liked', note: 'everything bagels > plain' }] }),
  purchase({ id: 'pu-sweet-1', item_name: 'Sweet bread', store_id: 'st-hilo-kta', date: daysAgo(7), outcome: 'loved', rating: 5, reactions: [] }),
  purchase({ id: 'pu-oat-1', item_name: 'Oat milk', store_id: 'st-hilo-target', date: daysAgo(14), outcome: 'bought', rating: 3, note: 'store brand — M2 says Oatly is better', reactions: [{ member_id: 'm2', reaction: 'neutral', note: 'fine in coffee, not solo' }] }),
  purchase({ id: 'pu-coffee-1', item_name: 'Mushroom coffee', store_id: 'st-amazon', date: daysAgo(35), outcome: 'loved', rating: 5, reactions: [{ member_id: 'm1', reaction: 'liked', note: null }] }),
  purchase({ id: 'pu-spam-1', item_name: 'Spam', store_id: 'st-kona-costco', date: daysAgo(30), outcome: 'bought', rating: 4, aisle_code: '112', reactions: [] }),
  purchase({ id: 'pu-sub-1', item_name: 'Greek yogurt', store_id: 'st-hilo-target', date: daysAgo(14), outcome: 'bought', rating: 3, note: 'substitute: only had the honey kind', reactions: [{ member_id: 'm3', reaction: 'neutral', note: null }] }),
]

// ---- returns -----------------------------------------------------------------
const returns = [
  { id: 're-1', item_name: 'Toddler shoes', store_id: 'st-hilo-target', reason: 'wrong size', status: 'pending' as const },
  { id: 're-2', item_name: 'Patio umbrella', store_id: 'st-kona-costco', reason: 'broken rib on first open', status: 'pending' as const },
  { id: 're-3', item_name: 'HDMI cable', store_id: 'st-hilo-walmart', reason: 'bought two', status: 'done' as const },
]

// ---- questions -----------------------------------------------------------------
const questions = [
  {
    id: 'q-1',
    photo: svgPhoto('🍜', '#fde68a'),
    text: 'Eight ramens on the shelf — which one? (see photo)',
    store_id: 'st-hilo-kta',
    item_id: 'it-ramen',
    status: 'open' as const,
    answer: null,
    created_at: daysAgo(1),
  },
  {
    id: 'q-2',
    photo: svgPhoto('🥛', '#bae6fd'),
    text: 'They only have the 64oz oat milk, get it?',
    store_id: 'st-hilo-target',
    item_id: 'it-milk-m2',
    status: 'answered' as const,
    answer: 'Yes, we go through it fast',
    created_at: daysAgo(14),
  },
]

export const seedDB = (): DB => ({
  islands,
  cities,
  stores,
  members,
  items,
  aisles,
  trips: [],
  returns,
  purchases,
  questions,
})
