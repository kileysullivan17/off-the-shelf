# DECISIONS.md — Island Shopping Companion

Judgment calls made during the autonomous build, most recent last.
"Cheap and reversible" decisions were made and logged; anything expensive
was deferred to the owner (see README "Cuts & deferred").

## D1 — Local data adapter now, Supabase one env-var away
**Context:** This machine has no Docker, no Supabase CLI, and the brief says
to stop before any step needing the owner's accounts — so no live Supabase
instance is reachable in this run.
**Decision:** Build a swappable `DataStore` interface with two implementations:
`SupabaseStore` (real `@supabase/supabase-js` calls, ready to use) and
`LocalStore` (localStorage, seeded demo data). The app picks Supabase when
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, local otherwise.
The full Postgres schema ships in `supabase/schema.sql`.
**Reversible:** yes — connecting a real project is config, not code.

## D2 — Commits via isomorphic-git
System git is broken (macOS 26.1, missing Xcode Command Line Tools; Homebrew
predates this OS and can't self-update without git). Commits are made with
`node scripts/commit.mjs "msg"` using isomorphic-git — they are real git
commits on `main` and fully compatible with normal git once CLT is fixed.

## D3 — Flexible store assignment is the default
Per brief: an item carries a `store_name` (chain, e.g. "Target") and is
satisfied at any location of that name; `pinned_store_id` pins it to one
location. The Add form defaults to flexible; pinning is an explicit toggle.

## D4 — Aisle codes live per (item name, store location)
A separate `item_aisles` table keyed by lowercased item name + store id, so
"bagels" learned at Hilo Target doesn't pollute Kona Target. Buying an item
prompts confirm/capture of its code at that location (aisle learning).

## D5 — Single-load data model
The whole household dataset is small (hundreds of rows), so the store exposes
one `load()` returning everything, cached under a single TanStack Query key;
mutations invalidate it. Massively simpler than per-table queries, and the
Supabase implementation still reads per-table under the hood. Revisit only if
data outgrows a phone.

## D6 — Trips embed stops & errands as JSON
`trips.stops` and `trips.errands` are `jsonb` columns rather than child
tables. One shared household account means no row-level contention; a later
multi-user upgrade can normalize additively (new tables, backfill, view).
Same for `purchases.reactions`.

## D7 — Item status cycle + move/park semantics
Tap cycles needed → bought → out of stock → substituted → needed. "Move to
another store" reassigns the store and leaves status `needed` at the target
(the `moved` status value exists in the enum for a future audit trail but the
item must reappear on the target list, so it lands as `needed`). "Park it"
sets `parked` — hidden from trip lists, kept everywhere else.

## D8 — Substitution flags "what do you think" via the Questions inbox
A substitution writes the purchase record (outcome `bought`, note prefixed
"substitute:") and opens a Question ("Substituted X — what do you think?") so
it lands on the one review screen with the photo threads.

## D9 — Aisle sort tie-breaking
Brief: sorted by aisle code, no-code items grouped at the end, "heat-safe
before perishable within the store." Interpreted as: primary sort natural
aisle-code order (G37 → G,37; A11B1 → A,11,B,1), then heat-safe before
perishable as tie-break, then name. No-code group uses the same tie-breaks.

## D10 — Stop ordering metric
"Stops with only heat-safe items first, perishable-heavy last" → stops sorted
by ascending count of non-heat-safe items (0 = all heat-safe, naturally
first), ties by fewer total items first. Manual reorder always wins.

## D11 — Deliberate v1 cuts (from the brief)
One shared household account, several devices: no per-user auth, roles, or
realtime presence. Schema keeps upgrade additive (member ids on reactions,
household-scoped tables). No deploy in this run.

## D12 — React Router v6 for the 8 screens
The brief doesn't name a router; react-router-dom v6 is the boring, stable
choice. Bottom tab nav: Plan / Add / Staples / History / More (More holds
Questions & Returns, Paste import, Settings — lower-frequency, and the More
tab badges open questions/pending returns).

## D13 — Photos as downscaled data URLs locally
Photos are canvas-downscaled (~700px JPEG) and stored as data URLs in the
local adapter; `SupabaseStore` uploads the same blobs to Storage instead.
Keeps one PhotoInput component and stays inside localStorage limits.

## D14 — Supabase seeding path
Demo seed lives once, in TypeScript (`src/lib/seed.ts`). When a real Supabase
project is connected, Settings shows a dev-only "Push demo seed" action that
writes the same seed through the DataStore interface — no duplicate seed.sql
to keep in sync.

## D15 — Aisle input on Add form only when pinned
A free-text aisle code at add-time is only meaningful at a specific location,
so the aisle field appears once a pinned location is chosen. Flexible items
learn their aisles at buy-time instead.

## D19 — Shared-household sign-in gate (2026-07-08)
The app is on a public URL, so connecting Supabase required real access
control. Owner chose a shared login over open access. Added an `AuthCapable`
surface on SupabaseStore (Supabase Auth email+password, session persisted in
localStorage) and an `AuthGate` that walls the whole app behind sign-in when
in Supabase mode; local demo mode is unchanged (no auth). One shared
household account — matches the v1 single-account model (D11). Sign-out lives
in Settings. RLS stays `to authenticated`, which is now satisfied.

## D18 — Deployed to Vercel on explicit owner request (2026-07-06)
The original brief said "do not deploy." The owner later asked for iPhone
access (work computer blocks localhost) and explicitly approved deploying
with their connected Vercel account. Live at
https://island-shopping-companion.vercel.app as a PWA (Add to Home Screen).
Still local-demo data mode — per-device storage until Supabase is connected.

## D17 — Text primary keys, app-generated
Schema uses `text` PKs (the app generates `crypto.randomUUID()` strings)
instead of `uuid default gen_random_uuid()`. Keeps LocalStore and Supabase
rows byte-identical and lets the readable demo seed push unmodified. Postgres
uuid-typed PKs would be a trivial later migration if ever wanted.

## D20 — Pass-through auth lock to stop the sign-in hang (2026-07-09)
On the first real Supabase sign-in, the app stuck on "Signing in…" forever with
no error. The auth endpoint was healthy (verified: 400 in ~0.6s on bad creds),
so the fault was client-side: supabase-js wraps auth ops in a `navigator.locks`
lock that can deadlock on some mobile/PWA browsers, so the session stores but the
`SIGNED_IN` event never fires. Fix: (1) pass a pass-through `auth.lock` — safe
with one shared account and no cross-tab refresh contention; (2) try/catch in
`signIn` so a thrown network/storage error surfaces instead of hanging; (3)
`AuthGate` flips the gate on sign-in success directly rather than depending
solely on the auth event. Reversible: yes — restore the default lock if we ever
move off a single shared account.

## D16 — Amazon standing list
Amazon is a store with null city; its needed items render as a simple
standing checklist section on the Plan screen (no trips, no aisles). Buying
from it still writes purchase records.

## D21 — Online is a bubble alongside the cities (2026-07-09)
Owner asked to move the always-pinned Amazon standing list into an "🌐 Online"
chip sitting in the same row as Hilo/Kea'au/Kona, so it selects like a city and
its standing list shows only when tapped. Generalized from "Amazon" to any store
with no city (city_id null), so the bubble is future-proof if another online
store is added; a per-item store badge appears only when more than one online
store exists. Buying still writes a purchase record noted "ordered online".
