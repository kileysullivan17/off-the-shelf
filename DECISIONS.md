# DECISIONS.md — Off the Shelf

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

## D22 — Cool-violet retint tokens (2026-07-22)
The delivered redesign's warm paper palette collided with the portfolio's other
warm apps, so Off the Shelf becomes the cool member of the family (see
design/design/RECOLOR-DIRECTION.md and design/implementation-prompt.md). Token
mapping judgment calls, all verified by scripts/contrast-check.mjs (31/31 AA,
checklist text AAA):
- in-cart takes the violet (#6d4ac9 family) — it is the action-in-progress
  state and the brief makes violet the dominant action color.
- substituted takes the deep teal in-cart vacated; moved takes blue; parked
  stays slate. Semantics unchanged, dot + label always.
- COLD/heat marker inverts to the one warm signal (amber on #fdecc8) — the
  lone warm note on a cool field reads as "watch the heat."
- Note highlight goes mustard → soft violet tint (#e9e1f9), ink text.
- Stops darkened during audit: ink-mute #6b757e → #68727b, danger #a8202d →
  #a01e2a (both were just under their minimums).
- brand-* aliases point at the violet ramp so unmigrated screens render the
  new hue; the aliases are removed once the screen retint commits land.
Reversible: yes — tokens are one block in src/index.css.

## D23 — Project renamed to Off the Shelf everywhere (2026-07-22)
Owner renamed the Vercel project; local names follow: package.json/lockfile
name, README, DECISIONS header, .vercel link metadata. Deliberately NOT
renamed: the localStorage key 'island-shopping-db-v1' in LocalStore.ts
(renaming would orphan existing demo data on devices — it is an internal
key, invisible to users), and historical entries/screenshot filenames that
record the old URL as it was. Post-rename check: Vercel kept the old
island-shopping-companion.vercel.app alias serving the same deployment, so
existing home-screen PWA installs keep working. Caveat found later:
off-the-shelf.vercel.app itself was already owned by an unrelated project
(the .vercel.app namespace is global), so the canonical public URL is
offtheshelf.vercel.app, attached 2026-07-22.

## D24 — The adoption diagnosis was imprecise; correcting it changed the roadmap (2026-09-09)
**Supersedes the previous framing.** It was recorded as: the household leaves for
the store in a rush against a deadline, so anything requiring setup before the
trip loses to just going. That reads as *setup costs too much*, and the next
iteration was scoped accordingly (ingest store maps, produce a per-store plan
before arrival).
**What is actually true:** setup is acceptable when it happens a day or more
ahead. What fails is setup that must happen in the few minutes before leaving.
The constraint is WHEN the work is required, not how much of it there is.
**Why it decides the roadmap:** if setup is too expensive you eliminate it, and
store maps are the obvious move. If setup is merely mistimed, store-map
ingestion is actively wrong, because ingesting a map is itself more setup landing
in the window that is already failing.
**Consequence:** store-map ingestion is removed from the next iteration. Later
problem, not a dead one, and it only pays off once the app is opened at all.
**Falsifier:** if setup done a day ahead also fails to happen, the constraint is
motivation rather than timing, and neither diagnosis is the real problem.

## D25 — The app should never be empty (2026-09-09)
**Decision:** opening cold, with no preparation, should yield a plausible list.
Purchase memory already exists and already knows what the household buys.
**Reasoning:** this removes a precondition rather than adding a feature. Every
other candidate change moves setup work around; this deletes the requirement
that any work happened, which is the only thing that makes the pre-trip window
survivable under D24.

## D26 — Walk order is learned from purchase timestamps, not assumed from aisle-code order (2026-09-09)
**Refines D9, which sorts by natural aisle-code order (G37 → G,37).** That sort
assumes aisle-code order matches the order the store is actually walked. It
often will not: numbering runs along one axis, and the route through a store
depends on entrance position, department layout, and habit.
**Decision:** derive the real walk order per store from the `date` column on
`purchases`, which is already `timestamptz default now()`. One trip yields one
ordering; several yield pairwise precedences that aggregate into a consensus
order. Fall back to D9's code sort where evidence is thin.
**Cost: no schema change.** `purchases.date` and `purchases.aisle_code` already
exist and are already written on every buy. This is a derivation over data the
app captures today, not new capture.
**Relationship to D4 and D15, which stay as they are.** `item_aisles` remains the
absolute anchor: a code learned at a location survives walking the store
backwards or doubling back, and transfers to newly added items without waiting
for a trip. Learned sequence describes the order aisles are actually visited.
The two compose; neither replaces the other.
**Known risk, and it is behavioural rather than technical:** this only works if
items are marked bought as they enter the cart, not batched at the car. If they
are batched there is no signal. Mitigation: detect batches (many buys inside a
few seconds) and discard them as ordering evidence rather than letting them
corrupt the model.
**Second risk:** retailers reset shelves seasonally, so weight recent trips more
heavily than old ones.
**Falsifier:** purchase timestamps arriving batched rather than distributed
across a trip. Observable from the first real trip, and it invalidates the whole
approach cheaply.

## D27 — Indoor positioning rejected; store layout is a sequence, not a map (2026-09-09)
**Considered and rejected:** logging device location while shopping to build a
store map.
**Why it does not work.** Grocery aisles sit roughly 3 to 4 metres apart and are
1.2 to 1.5 metres wide. Consumer GPS is 3 to 5 metres in open sky and degrades
further indoors, where signal reflects off steel shelving and a metal roof. It
cannot resolve aisle 4 from aisle 6, which is the only distinction that matters.
Technologies that do work indoors need infrastructure outside this project's
control: BLE beacons installed by the retailer, Wi-Fi fingerprinting with a
survey phase and scan APIs iOS does not expose to third-party apps, or magnetic
fingerprinting which also needs a survey.
**The reframe that removes the problem:** routing never requires knowing that
milk sits at x=12.3, y=4.1. It requires knowing that milk comes before bread
comes before eggs. That is an ordering, and D26 obtains it for free.
**Cost of the chosen path:** no location permission, no battery drain, no
beacons, no survey, no retailer cooperation.

## D28 — External retailer data is an optional accelerant, never a foundation (2026-09-09)
**Decision:** no external retailer API sits on the critical path. Such an
integration may only pre-populate `item_aisles` for a system that already works
without it.
**What was investigated.** Kroger publishes a developer portal exposing
store-level product data and is the one major chain with a sanctioned public
route. It does not operate in Hawaii, so it is unavailable for every store this
app is used in. Target's own app displays aisle locations, so the data exists,
but there is no sanctioned public API; the commonly used route is RedSky,
Target's internal API, which is undocumented, reverse-engineered, unsupported
and not a sanctioned integration. Paid third-party resellers are the same data
behind a scraping layer. No Hawaii-local chain (KTA, Foodland, Times) publishes
anything, and none plausibly will.
**Two reasons it stays off the critical path.**
1. Fragility lands in the worst place. An undocumented dependency will break, and
   when it does the app degrades silently in the minutes before a trip, which is
   the exact failure mode D24 exists to fix.
2. Coverage does not work. The unit is a city run across multiple stores. Target
   is one store of five or six; a Target-only solution yields two code paths, one
   store that behaves well and five that do not.
**Resulting architecture, which inverts the usual instinct:** the manual and
learned path (D4, D26) is the reliable substrate. An API, if ever added, is a
seeder that lets one store start warm; if it breaks, that store degrades to
learn-as-you-go like every other store.
**Noted for later:** `item_aisles` rows are a shared asset. With more than one
household, one person's tagging at a given store benefits every other shopper
there, and coverage solves itself through use rather than through an API.
Premature under D11's single-account model; worth having written down.

## D29 — Build order, and why this order (2026-09-09)
1. **Learned sequence from existing purchase timestamps (D26).** No schema
   change, no new capture, no new UI. Tests the one behavioural assumption
   everything else rests on.
2. **Aisle-capture friction work on top of D4 and D15.** Only if timestamps
   arrive distributed rather than batched.
3. **Retailer API seeding, Target only (D28).** Optional, last, and only once the
   thing it accelerates already works.
**Principle:** ship the step that validates the load-bearing assumption before
building anything resting on it. Step 3 is also the easiest to cut, which is a
good sign it is correctly placed.
**Selected 2026-09-09: step 1 only.** Steps 2 and 3 are explicitly not authorised
until the purchase-timestamp distribution has been observed.
