# Off the Shelf

A mobile-first household shopping companion (formerly "Island Shopping
Companion") built around how shopping on
Hawaii Island actually works: stores live in different cities, a shopping day
is a **city run** hitting several stores in one trip, heat-safe purchases come
first and perishables last, and a **purchase memory** remembers what every
household member tried, liked, and rejected.

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS 4 · React Hook Form + Zod
· TanStack Query · Supabase (schema + client ready; local demo adapter by
default) · deployable to Vercel.

## Run it

```bash
npm install
npm run dev        # → http://localhost:5173
npm test           # parser + trip-logic tests
npm run build      # typecheck + production build
```

Opens in **local demo mode**: the full seed (Hilo + Kona stores, members
M1–M4, staples, aisle codes, deep purchase history) lives in localStorage on
first load. Settings → “Reset demo data” restores it anytime.

## Going live on Supabase (when you're ready)

1. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
2. Create one shared household user (Auth → add user).
3. `cp .env.example .env.local` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Restart the dev server — Settings will show “Supabase connected”, and a
   dev-only “push demo seed” path exists via `SupabaseStore.resetToSeed()`.

The data layer is a swappable `DataStore` interface (`src/lib/store/`); the
UI is identical in both modes.

## The eight screens

1. **Plan a run** — pick a city; the run assembles every store there with
   needed items, ordered all-heat-safe stops first, perishable-heavy last;
   manual reorder; errands ride along; Amazon standing list below.
2. **Trip mode** — per-store checklist sorted by learned aisle codes
   (no-code items at the end), instruction notes prominent, photo-requested
   badge with one-tap camera, tap cycles bought → out of stock → substituted,
   “move to another store” (the *x HD* habit), “park it” (the *not yet*
   habit), pending returns surface at the right store, next-stop navigation.
3. **Add items** — fast capture; flexible store assignment by default,
   optional pin to a location (a store is always name + city).
4. **Staples** — one-tap re-add (poi, bagels, sweet bread, per-member milk
   variants, mushroom coffee seeded).
5. **History** — the purchase memory; search “ramen” standing in the aisle
   and see four attempts with ratings, dates, stores, and per-member
   reactions (+ add reactions from home).
6. **Questions & returns** — both directions: shopper snaps “eight ramens,
   which one?” photos; home flags items photo-requested and answers land on
   the item's thread; returns ledger per store location.
7. **Paste import** — paste the real messy list (store lines, `*`/`x`
   markers, `x 2` quantities, `G37` aisle codes, parenthetical notes), review
   the parsed rows, save. Never fails hard on garbage.
8. **Settings** — rename members, manage cities/stores, data mode + reset.

## Verified demos (headless-browser tested)

- Kona run orders Home Depot (all heat-safe) → Target → Costco (perishables).
- Hilo Target checklist sorts A11B1 → B15 → C2 → C4 → G37 → no-code items.
- Buying an item confirms/learns its aisle for next time (E12 prefilled).
- `ramen` history shows the winner, the too-spicy one, and M3's reactions.
- Paste import round-trips a messy 3-store sample.

## Deliberate v1 cuts

- **One shared household account** — no per-user auth, roles, or realtime
  presence. Schema designed so multi-user is additive (see DECISIONS.md D11).
- **Deployed** — live on Vercel as a PWA in the cool-violet "Off the Shelf"
  design (see design/ for the retint package and verify screenshots).
- **Trips/reactions as jsonb** rather than child tables (D6).
- Aisle input at add-time only for pinned items; flexible items learn aisles
  at buy-time (D15).

Full judgment-call log: [DECISIONS.md](./DECISIONS.md).
