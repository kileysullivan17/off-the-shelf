import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import {
  aisleFor, memberName, pendingReturnsForStore, sortForStore, storeById,
} from '../lib/tripLogic'
import { norm, uid, type Item, type ItemStatus } from '../lib/types'
import {
  Badge, Card, EmptyState, GhostButton, PhotoInput, PrimaryButton,
  SectionHeader, Sheet, StarRating, useToast,
} from '../components/ui'

/** Tap cycle (D7): needed → bought → out of stock → substituted → needed. */
const NEXT_STATUS: Partial<Record<ItemStatus, ItemStatus>> = {
  needed: 'bought',
  in_cart: 'bought',
  bought: 'out_of_stock',
  out_of_stock: 'substituted',
  substituted: 'needed',
}

const STATUS_GLYPH: Record<ItemStatus, { glyph: string; cls: string; label: string }> = {
  needed: { glyph: '', cls: 'border-stone-300', label: 'needed' },
  in_cart: { glyph: '🛒', cls: 'border-brand-600', label: 'in cart' },
  bought: { glyph: '✓', cls: 'border-emerald-500 bg-emerald-500 text-white', label: 'bought' },
  out_of_stock: { glyph: '⊘', cls: 'border-red-400 bg-red-400 text-white', label: 'out of stock' },
  substituted: { glyph: '↺', cls: 'border-sky-500 bg-sky-500 text-white', label: 'substituted' },
  moved: { glyph: '→', cls: 'border-stone-300 text-stone-400', label: 'moved' },
  parked: { glyph: '⏸', cls: 'border-stone-300 text-stone-400', label: 'parked' },
}

export function TripMode() {
  const { tripId } = useParams()
  const { data: db } = useDB()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [toast, showToast] = useToast()
  const [stopIdx, setStopIdx] = useState(0)
  // per-trip guard so cycling a row back and forth doesn't double-record
  const [recorded, setRecorded] = useState<Set<string>>(new Set())

  const [buySheet, setBuySheet] = useState<{ item: Item; code: string; rating: number | null } | null>(null)
  const [subSheet, setSubSheet] = useState<{ item: Item; note: string } | null>(null)
  const [actionItem, setActionItem] = useState<Item | null>(null)
  const [aisleEdit, setAisleEdit] = useState<{ item: Item; code: string } | null>(null)

  const trip = db?.trips.find((t) => t.id === tripId)
  const stops = useMemo(() => (trip ? [...trip.stops].sort((a, b) => a.position - b.position) : []), [trip])
  const store = db && stops[stopIdx] ? storeById(db, stops[stopIdx].store_id) : undefined

  const storeItems = useMemo(() => {
    if (!db || !store) return []
    const relevant = db.items.filter((it) => {
      if (it.status === 'parked' || it.status === 'moved') return false
      if (it.pinned_store_id) return it.pinned_store_id === store.id
      return norm(it.store_name) === norm(store.name)
    })
    return sortForStore(db, store, relevant)
  }, [db, store])

  if (!db) return <EmptyState>Loading…</EmptyState>
  if (!trip || !store) {
    return (
      <div className="p-4">
        <EmptyState>Trip not found.</EmptyState>
        <Link to="/" className="block text-center font-medium text-brand-700">← Plan a run</Link>
      </div>
    )
  }

  const cityLabel = db.cities.find((c) => c.id === trip.city_id)?.name ?? ''
  const doneCount = storeItems.filter((i) => i.status !== 'needed' && i.status !== 'in_cart').length
  const returns = pendingReturnsForStore(db, store.id)

  const setStatus = (item: Item, status: ItemStatus) =>
    mutate.mutate((s) => s.upsertItem({ ...item, status }))

  const cycle = (item: Item) => {
    const next = NEXT_STATUS[item.status] ?? 'needed'
    setStatus(item, next)
    if (next === 'bought' && !recorded.has(item.id)) {
      setBuySheet({ item, code: aisleFor(db, store.id, item.name) ?? '', rating: null })
    }
    if (next === 'substituted') {
      setSubSheet({ item, note: '' })
    }
  }

  const saveBuy = () => {
    if (!buySheet) return
    const { item, code, rating } = buySheet
    const when = new Date().toISOString()
    mutate.mutate(async (s) => {
      // purchase memory (behavior 5) + aisle learning (behavior 3)
      await s.addPurchase({
        id: uid(), item_name: item.name, store_id: store.id, date: when,
        outcome: 'bought', rating, reactions: [], aisle_code: code.trim() || null,
        note: null, photo: null,
      })
      if (code.trim()) {
        await s.setAisle({
          id: uid(), store_id: store.id, item_name: norm(item.name),
          code: code.trim().toUpperCase(), confirmed_at: when,
        })
      }
    })
    setRecorded((r) => new Set(r).add(item.id))
    setBuySheet(null)
    showToast('Saved to memory ✓')
  }

  const saveSub = () => {
    if (!subSheet) return
    const { item, note } = subSheet
    const when = new Date().toISOString()
    mutate.mutate(async (s) => {
      await s.addPurchase({
        id: uid(), item_name: item.name, store_id: store.id, date: when,
        outcome: 'bought', rating: null, reactions: [],
        aisle_code: null, note: `substitute: ${note.trim() || 'unspecified'}`, photo: null,
      })
      // "what do you think" lands on the review screen (D8)
      await s.upsertQuestion({
        id: uid(), photo: null,
        text: `Substituted ${item.name}${note.trim() ? ` with ${note.trim()}` : ''} — what do you think?`,
        store_id: store.id, item_id: item.id, status: 'open', answer: null, created_at: when,
      })
    })
    setRecorded((r) => new Set(r).add(item.id))
    setSubSheet(null)
    showToast('Flagged for review ✓')
  }

  const attachPhoto = (item: Item, dataUrl: string) => {
    const existing = db.questions.find((q) => q.item_id === item.id && q.status === 'open')
    mutate.mutate((s) =>
      s.upsertQuestion(
        existing
          ? { ...existing, photo: dataUrl }
          : {
              id: uid(), photo: dataUrl, text: `📷 Photo check: ${item.name}`,
              store_id: store.id, item_id: item.id, status: 'open', answer: null,
              created_at: new Date().toISOString(),
            },
      ),
    )
    showToast('Photo sent to review ✓')
  }

  const moveToStore = (item: Item, chainName: string) => {
    // the "x HD" habit: reassign, keep it needed at the target (D7)
    mutate.mutate((s) =>
      s.upsertItem({ ...item, store_name: chainName, pinned_store_id: null, status: 'needed' }),
    )
    setActionItem(null)
    showToast(`Moved to ${chainName}`)
  }

  const chainNames = [...new Set(db.stores.map((st) => st.name))].filter(
    (n) => norm(n) !== norm(store.name),
  )

  const toggleErrand = (id: string) =>
    mutate.mutate((s) =>
      s.upsertTrip({
        ...trip,
        errands: trip.errands.map((e) => (e.id === id ? { ...e, done: !e.done } : e)),
      }),
    )

  const finishTrip = () => {
    mutate.mutate((s) => s.upsertTrip({ ...trip, status: 'done' }), {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <div className="p-4">
      {toast}
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        <Link to={`/history`} className="text-sm font-medium text-brand-700">🔎 memory</Link>
      </div>
      <p className="mb-3 text-sm text-stone-500">
        {cityLabel} run · stop {stopIdx + 1} of {stops.length} · {doneCount}/{storeItems.length} handled
      </p>

      {/* stop switcher */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {stops.map((s, i) => {
          const st = storeById(db, s.store_id)
          return (
            <button
              key={s.store_id}
              onClick={() => setStopIdx(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                i === stopIdx ? 'bg-brand-700 text-white' : 'bg-white border border-stone-300 text-stone-600'
              }`}
            >
              {i + 1}. {st?.name ?? '?'}
            </button>
          )
        })}
      </div>

      {returns.length > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-semibold text-red-700">↩︎ Returns to drop off here</p>
          {returns.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.item_name}</p>
                {r.reason && <p className="text-xs text-stone-500">{r.reason}</p>}
              </div>
              <GhostButton onClick={() => mutate.mutate((s) => s.upsertReturn({ ...r, status: 'done' }))}>
                Done ✓
              </GhostButton>
            </div>
          ))}
        </Card>
      )}

      {storeItems.length === 0 && <EmptyState>Nothing on the list for this stop.</EmptyState>}

      <div className="space-y-2">
        {storeItems.map((item) => {
          const code = aisleFor(db, store.id, item.name)
          const glyph = STATUS_GLYPH[item.status]
          const done = item.status !== 'needed' && item.status !== 'in_cart'
          const member = memberName(db, item.member_id)
          return (
            <Card key={item.id} className={`p-3 ${done ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => cycle(item)}
                  aria-label={`status: ${glyph.label} — tap to change`}
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold ${glyph.cls}`}
                >
                  {glyph.glyph}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={`font-semibold ${done ? 'line-through' : ''}`}>{item.name}</span>
                    {item.quantity_note && <span className="text-sm text-stone-500">{item.quantity_note}</span>}
                    {!item.heat_safe && <span title="perishable — keep cool">🧊</span>}
                  </div>
                  {item.instruction_note && (
                    <p className="mt-0.5 rounded-lg bg-amber-50 px-2 py-1 text-[13px] font-medium text-amber-800">
                      ⚠️ {item.instruction_note}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setAisleEdit({ item, code: code ?? '' })}
                      className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600"
                    >
                      {code ? `aisle ${code}` : '+ aisle'}
                    </button>
                    {member && <Badge tone="teal">{member}</Badge>}
                    {item.status === 'substituted' && <Badge tone="blue">substituted</Badge>}
                    {item.status === 'out_of_stock' && <Badge tone="red">out of stock</Badge>}
                    {item.photo_requested && <Badge tone="amber">📷 photo requested</Badge>}
                  </div>
                  {item.photo_requested && (
                    <div className="mt-2">
                      <PhotoInput label="📷 Send pic before buying" onPhoto={(url) => attachPhoto(item, url)} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActionItem(item)}
                  aria-label={`more actions for ${item.name}`}
                  className="px-1 text-xl text-stone-400"
                >
                  ⋯
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {trip.errands.length > 0 && (
        <>
          <SectionHeader>Errands on this run</SectionHeader>
          <Card className="p-3">
            {trip.errands.map((e) => (
              <label key={e.id} className="flex items-center gap-3 py-1.5">
                <input type="checkbox" checked={e.done} onChange={() => toggleErrand(e.id)} className="h-5 w-5 accent-teal-700" />
                <span className={`text-sm ${e.done ? 'text-stone-400 line-through' : ''}`}>{e.text}</span>
              </label>
            ))}
          </Card>
        </>
      )}

      <div className="mt-5">
        {stopIdx < stops.length - 1 ? (
          <PrimaryButton className="w-full" onClick={() => { setStopIdx(stopIdx + 1); window.scrollTo(0, 0) }}>
            Next stop → {storeById(db, stops[stopIdx + 1].store_id)?.name}
          </PrimaryButton>
        ) : (
          <PrimaryButton className="w-full" onClick={finishTrip}>Finish trip ✓</PrimaryButton>
        )}
      </div>

      {/* ------- bought: confirm aisle + optional rating (behaviors 3 & 5) ------- */}
      <Sheet open={!!buySheet} onClose={saveBuy} title={buySheet ? `Got it — ${buySheet.item.name}` : ''}>
        {buySheet && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-600">
                Aisle at {store.name} (so next trip is pre-sorted)
              </label>
              <input
                value={buySheet.code}
                onChange={(e) => setBuySheet({ ...buySheet, code: e.target.value })}
                placeholder="e.g. G37"
                autoCapitalize="characters"
                className="w-full rounded-xl border border-stone-300 px-3 py-3 text-lg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-600">Quick rating (optional)</label>
              <StarRating value={buySheet.rating} onChange={(v) => setBuySheet({ ...buySheet, rating: v })} />
            </div>
            <PrimaryButton className="w-full" onClick={saveBuy}>Save</PrimaryButton>
          </div>
        )}
      </Sheet>

      {/* ------- substituted: note + review flag (D8) ------- */}
      <Sheet open={!!subSheet} onClose={saveSub} title={subSheet ? `Substituted ${subSheet.item.name}` : ''}>
        {subSheet && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-600">What did you get instead?</label>
              <input
                value={subSheet.note}
                onChange={(e) => setSubSheet({ ...subSheet, note: e.target.value })}
                placeholder="brand / size / kind"
                className="w-full rounded-xl border border-stone-300 px-3 py-3"
              />
            </div>
            <p className="text-sm text-stone-500">This flags “what do you think?” on the review screen.</p>
            <PrimaryButton className="w-full" onClick={saveSub}>Save</PrimaryButton>
          </div>
        )}
      </Sheet>

      {/* ------- aisle edit ------- */}
      <Sheet open={!!aisleEdit} onClose={() => setAisleEdit(null)} title={aisleEdit ? `Aisle for ${aisleEdit.item.name}` : ''}>
        {aisleEdit && (
          <div className="space-y-4">
            <input
              value={aisleEdit.code}
              onChange={(e) => setAisleEdit({ ...aisleEdit, code: e.target.value })}
              placeholder="e.g. A11B1"
              autoCapitalize="characters"
              className="w-full rounded-xl border border-stone-300 px-3 py-3 text-lg"
            />
            <PrimaryButton
              className="w-full"
              onClick={() => {
                const { item, code } = aisleEdit
                if (code.trim()) {
                  mutate.mutate((s) =>
                    s.setAisle({
                      id: uid(), store_id: store.id, item_name: norm(item.name),
                      code: code.trim().toUpperCase(), confirmed_at: new Date().toISOString(),
                    }),
                  )
                }
                setAisleEdit(null)
              }}
            >
              Save aisle
            </PrimaryButton>
          </div>
        )}
      </Sheet>

      {/* ------- per-item action sheet ------- */}
      <Sheet open={!!actionItem} onClose={() => setActionItem(null)} title={actionItem?.name}>
        {actionItem && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-600">Move to another store (“x HD”)</p>
            <div className="flex flex-wrap gap-2">
              {chainNames.map((n) => (
                <GhostButton key={n} onClick={() => moveToStore(actionItem, n)}>{n}</GhostButton>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <GhostButton
                onClick={() => {
                  setStatus(actionItem, 'parked')
                  setActionItem(null)
                  showToast('Parked — not deleted')
                }}
              >
                ⏸ Park it (“not yet”)
              </GhostButton>
              <Link
                to={`/history?q=${encodeURIComponent(actionItem.name)}`}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-sm font-medium text-stone-700"
              >
                🧠 What did we think?
              </Link>
            </div>
            <div className="mt-2">
              <PhotoInput label="📷 Snap & ask home" onPhoto={(url) => { attachPhoto(actionItem, url); setActionItem(null) }} />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
