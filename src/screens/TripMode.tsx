import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import {
  aisleFor, memberName, pendingReturnsForStore, sortForStore, storeById,
} from '../lib/tripLogic'
import { norm, uid, type Item, type ItemStatus } from '../lib/types'
import {
  Badge, EmptyState, GhostButton, PhotoInput, PrimaryButton,
  SectionHeader, Sheet, StarRating, useToast,
} from '../components/ui'
import {
  BasketIcon, CameraIcon, CheckIcon, PauseIcon, SunIcon, SwapIcon, XIcon,
} from '../components/icons'

/** Tap cycle (D7): needed → bought → out of stock → substituted → needed. */
const NEXT_STATUS: Partial<Record<ItemStatus, ItemStatus>> = {
  needed: 'bought',
  in_cart: 'bought',
  bought: 'out_of_stock',
  out_of_stock: 'substituted',
  substituted: 'needed',
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  needed: 'needed',
  in_cart: 'in cart',
  bought: 'bought',
  out_of_stock: 'out of stock',
  substituted: 'substituted',
  moved: 'moved',
  parked: 'parked',
}

/** The box zone — 24px status box, glyph + word discipline (never color alone). */
function StatusBox({ status }: { status: ItemStatus }) {
  const base = 'flex h-6 w-6 items-center justify-center rounded-md'
  switch (status) {
    case 'needed':
      return <span className={`${base} border-[2.5px] border-ink`} />
    case 'in_cart':
      return (
        <span className={`${base} border-[2.5px] border-violet-deep bg-violet-tint text-violet-deep`}>
          <BasketIcon size={14} />
        </span>
      )
    case 'bought':
      return (
        <span className={`${base} bg-bought text-paper`}>
          <CheckIcon size={14} />
        </span>
      )
    case 'out_of_stock':
      return (
        <span className={`${base} border-[2.5px] border-danger bg-danger-tint text-danger`}>
          <XIcon size={12} />
        </span>
      )
    case 'substituted':
      return (
        <span className={`${base} bg-sub text-paper`}>
          <SwapIcon size={14} />
        </span>
      )
    case 'moved':
      return (
        <span className={`${base} border-[2.5px] border-moved text-moved`}>
          <SwapIcon size={14} />
        </span>
      )
    case 'parked':
      return (
        <span className={`${base} border-[2.5px] border-dashed border-parked text-parked`}>
          <PauseIcon size={11} />
        </span>
      )
  }
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
        <Link to="/" className="block text-center font-mono text-[12px] font-bold uppercase tracking-[.06em] text-violet-deep">
          ← Plan a run
        </Link>
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

  const progress = storeItems.length ? Math.round((doneCount / storeItems.length) * 100) : 0

  return (
    <div>
      {toast}

      {/* header band */}
      <div className="border-b border-rule px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{store.name}</h1>
            <p className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
              {cityLabel} · stop {stopIdx + 1}/{stops.length}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold leading-none">
              {doneCount}
              <span className="text-ink-mute">/{storeItems.length}</span>
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-ink-soft">handled</p>
          </div>
          <Link
            to="/history"
            className="rounded-full border-[1.5px] border-rule-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[.04em] text-ink-soft"
          >
            Memory
          </Link>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-rule">
          <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* stop switcher */}
      <div className="flex gap-2 overflow-x-auto border-b border-rule px-4 py-2.5">
        {stops.map((s, i) => {
          const st = storeById(db, s.store_id)
          return (
            <button
              key={s.store_id}
              onClick={() => setStopIdx(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[.04em] ${
                i === stopIdx ? 'bg-ink text-paper' : 'border-[1.5px] border-rule-2 text-ink-soft'
              }`}
            >
              {i + 1} · {st?.name ?? '?'}
            </button>
          )
        })}
      </div>

      <div className="px-0 pb-4">
        {returns.length > 0 && (
          <div className="border-b border-rule">
            <div className="flex items-center bg-danger-tint px-4 py-1.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[.1em] text-danger">
                Returns — drop off here
              </span>
            </div>
            {returns.map((r) => (
              <div key={r.id} className="flex min-h-[54px] items-center gap-3 border-b border-rule px-4 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{r.item_name}</p>
                  {r.reason && (
                    <p className="font-mono text-[11px] font-semibold text-ink-soft">{r.reason}</p>
                  )}
                </div>
                <GhostButton onClick={() => mutate.mutate((s) => s.upsertReturn({ ...r, status: 'done' }))}>
                  Done ✓
                </GhostButton>
              </div>
            ))}
          </div>
        )}

        {storeItems.length === 0 && <EmptyState>Nothing on the list for this stop.</EmptyState>}

        <div>
          {storeItems.map((item) => {
            const code = aisleFor(db, store.id, item.name)
            const done = item.status !== 'needed' && item.status !== 'in_cart'
            const member = memberName(db, item.member_id)
            return (
              <div
                key={item.id}
                className={`flex min-h-[54px] items-stretch gap-2 border-b border-rule py-1.5 pr-2.5 ${done ? 'opacity-55' : ''}`}
              >
                {/* box zone — the deliberate left reach; only this changes status */}
                <button
                  onClick={() => cycle(item)}
                  aria-label={`status: ${STATUS_LABEL[item.status]} — tap to change`}
                  className="flex w-[46px] shrink-0 items-center justify-center self-stretch"
                >
                  <StatusBox status={item.status} />
                </button>
                <div className="min-w-0 flex-1 self-center">
                  <p className={`text-base font-bold leading-[21px] tracking-tight ${done ? 'line-through decoration-2' : ''}`}>
                    {item.name}
                    {item.status === 'substituted' && <> <Badge tone="teal">Sub’d</Badge></>}
                    {item.status === 'out_of_stock' && <> <Badge tone="red">Out</Badge></>}
                  </p>
                  {(item.instruction_note || member || !item.heat_safe || item.photo_requested || item.quantity_note) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.instruction_note && (
                        <span className="rounded bg-highlight px-1.5 py-px text-[13px] font-bold leading-[18px]">
                          {item.instruction_note}
                        </span>
                      )}
                      {item.quantity_note && (
                        <span className="font-mono text-[12px] font-bold text-ink-soft">{item.quantity_note}</span>
                      )}
                      {!item.heat_safe && (
                        <Badge tone="amber">
                          <SunIcon size={10} /> keep cool
                        </Badge>
                      )}
                      {item.photo_requested && (
                        <Badge tone="stone">
                          <CameraIcon size={10} /> pic?
                        </Badge>
                      )}
                      {member && <Badge tone="member">{member}</Badge>}
                    </div>
                  )}
                  {item.photo_requested && (
                    <div className="mt-2">
                      <PhotoInput label="Send pic before buying" onPhoto={(url) => attachPhoto(item, url)} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                  <button
                    onClick={() => setAisleEdit({ item, code: code ?? '' })}
                    className="rounded-md bg-chip px-1.5 py-0.5 font-mono text-[12px] font-bold"
                  >
                    {code ?? '+ aisle'}
                  </button>
                  <button
                    onClick={() => setActionItem(item)}
                    aria-label={`more actions for ${item.name}`}
                    className="px-1 font-mono text-base font-bold leading-none text-ink-mute"
                  >
                    ⋯
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {trip.errands.length > 0 && (
          <div className="px-4">
            <SectionHeader>Errands on this run</SectionHeader>
            <div>
              {trip.errands.map((e) => (
                <label key={e.id} className="flex min-h-[44px] items-center gap-3 border-b border-rule py-1.5 last:border-b-0">
                  <input type="checkbox" checked={e.done} onChange={() => toggleErrand(e.id)} className="h-5 w-5 accent-violet" />
                  <span className={`text-sm font-semibold ${e.done ? 'text-ink-mute line-through' : ''}`}>{e.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 px-4">
          {stopIdx < stops.length - 1 ? (
            <PrimaryButton className="w-full" onClick={() => { setStopIdx(stopIdx + 1); window.scrollTo(0, 0) }}>
              Next stop → {storeById(db, stops[stopIdx + 1].store_id)?.name}
            </PrimaryButton>
          ) : (
            <PrimaryButton className="w-full" onClick={finishTrip}>Finish trip ✓</PrimaryButton>
          )}
        </div>
      </div>

      {/* ------- bought: confirm aisle + optional rating (behaviors 3 & 5) ------- */}
      <Sheet open={!!buySheet} onClose={saveBuy} title={buySheet ? `Got it — ${buySheet.item.name}` : ''}>
        {buySheet && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
                Aisle at {store.name} — next trip pre-sorts
              </label>
              <input
                value={buySheet.code}
                onChange={(e) => setBuySheet({ ...buySheet, code: e.target.value })}
                placeholder="e.g. G37"
                autoCapitalize="characters"
                className="w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 font-mono text-lg font-bold"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
                Quick rating (optional)
              </label>
              <StarRating value={buySheet.rating} onChange={(v) => setBuySheet({ ...buySheet, rating: v })} />
            </div>
            <PrimaryButton className="w-full" onClick={saveBuy}>Save</PrimaryButton>
          </div>
        )}
      </Sheet>

      {/* ------- substituted: note + review flag (D8) ------- */}
      <Sheet open={!!subSheet} onClose={saveSub} title={subSheet ? `Substituting: ${subSheet.item.name}` : ''}>
        {subSheet && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
                What did you get instead?
              </label>
              <input
                value={subSheet.note}
                onChange={(e) => setSubSheet({ ...subSheet, note: e.target.value })}
                placeholder="brand / size / kind"
                className="w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 text-base font-bold"
              />
            </div>
            <div className="rounded-xl border-[1.5px] border-magenta-border bg-magenta-tint px-3.5 py-3">
              <p className="text-[15px] font-extrabold text-magenta-ink">Flags “what do you think?”</p>
              <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.04em] text-ink-soft">
                They see sub’d + your note at home
              </p>
            </div>
            <PrimaryButton className="w-full" onClick={saveSub}>Confirm sub</PrimaryButton>
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
              className="w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 font-mono text-lg font-bold"
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
            <p className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
              Move to another store (“x HD”)
            </p>
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
                Park — not yet
              </GhostButton>
              <Link
                to={`/history?q=${encodeURIComponent(actionItem.name)}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-ink px-3 py-2 text-center font-mono text-[12px] font-extrabold uppercase tracking-[.06em] text-ink"
              >
                What did we think?
              </Link>
            </div>
            <div className="mt-2">
              <PhotoInput label="Snap & ask home" onPhoto={(url) => { attachPhoto(actionItem, url); setActionItem(null) }} />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
