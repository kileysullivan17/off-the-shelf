import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { activeTrip, assembleRun, pendingReturnsForStore, type PlannedStop } from '../lib/tripLogic'
import { norm, uid, type Errand, type Item } from '../lib/types'
import { Badge, EmptyState, GhostButton, PrimaryButton, SectionHeader, useToast } from '../components/ui'
import { ArrowIcon, CheckIcon, SunIcon } from '../components/icons'

const ONLINE = 'online'

export function PlanRun() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [toast, showToast] = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const cityId = selected && selected !== ONLINE ? selected : null
  const [stopOrder, setStopOrder] = useState<string[] | null>(null) // manual reorder (D10)
  const [errands, setErrands] = useState<Errand[]>([])
  const [errandText, setErrandText] = useState('')

  const current = db ? activeTrip(db) : null

  const assembled = useMemo(
    () => (db && cityId ? assembleRun(db, cityId) : []),
    [db, cityId],
  )

  // Reset manual order when the city (or its assembly) changes shape.
  useEffect(() => {
    setStopOrder(null)
  }, [cityId])

  if (!db) return <EmptyState>Loading…</EmptyState>

  const stops: PlannedStop[] = stopOrder
    ? [...assembled].sort((a, b) => stopOrder.indexOf(a.store.id) - stopOrder.indexOf(b.store.id))
    : assembled

  const move = (idx: number, dir: -1 | 1) => {
    const ids = stops.map((s) => s.store.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    setStopOrder(ids)
  }

  const startRun = () => {
    if (!cityId || stops.length === 0) return
    const trip = {
      id: uid(),
      city_id: cityId,
      date: new Date().toISOString().slice(0, 10),
      status: 'active' as const,
      stops: stops.map((s, i) => ({ store_id: s.store.id, position: i })),
      errands,
    }
    mutate.mutate((s) => s.upsertTrip(trip), { onSuccess: () => navigate(`/trip/${trip.id}`) })
  }

  // "Online" bubble: items belonging to any store with no city (Amazon today).
  const onlineStoreNames = new Set(db.stores.filter((s) => !s.city_id).map((s) => norm(s.name)))
  const onlineItems = db.items.filter(
    (it) => onlineStoreNames.has(norm(it.store_name)) && (it.status === 'needed' || it.status === 'in_cart'),
  )
  const multipleOnlineStores = onlineStoreNames.size > 1

  const buyOnline = (item: Item) => {
    const store = db.stores.find((s) => !s.city_id && norm(s.name) === norm(item.store_name))
    mutate.mutate(async (s) => {
      await s.upsertItem({ ...item, status: 'bought' })
      if (store) {
        await s.addPurchase({
          id: uid(), item_name: item.name, store_id: store.id,
          date: new Date().toISOString(), outcome: 'bought', rating: null,
          reactions: [], aisle_code: null, note: 'ordered online', photo: null,
        })
      }
    })
    showToast(`${item.name} ordered ✓`)
  }

  const cityChip = (id: string, label: string) => (
    <button
      key={id}
      onClick={() => setSelected(id)}
      className={`rounded-full px-4 py-2.5 font-mono text-[12px] font-extrabold uppercase tracking-[.06em] ${
        selected === id ? 'bg-ink text-paper' : 'border-[1.5px] border-rule-2 text-ink-soft'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      {toast}
      <div className="border-b border-rule px-4 pb-3.5 pt-4">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Plan a run</h1>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
          Where are you headed? Cold rides shortest.
        </p>
      </div>

      <div className="px-4 pb-4">
        {current && (
          <Link to={`/trip/${current.id}`} className="mt-4 block">
            <div className="rounded-[14px] border-2 border-violet bg-violet-tint p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-violet-deep">
                    Trip in progress — {db.cities.find((c) => c.id === current.city_id)?.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
                    {current.stops.length} stops · tap to resume
                  </p>
                </div>
                <ArrowIcon size={18} className="text-violet-deep" />
              </div>
            </div>
          </Link>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {db.cities.map((c) => cityChip(c.id, c.name))}
          {cityChip(ONLINE, 'Online')}
        </div>

        {cityId && (
          <>
            <SectionHeader>The run · {stops.length} stops</SectionHeader>
            {stops.length === 0 && <EmptyState>Nothing needed in this city right now.</EmptyState>}
            <div className="space-y-2.5">
              {stops.map((s, i) => {
                const returns = pendingReturnsForStore(db, s.store.id).length
                return (
                  <div key={s.store.id} className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-rule-2 p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-[13px] font-extrabold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-extrabold tracking-tight">{s.store.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-ink-soft">{s.items.length} items</span>
                        {s.perishableCount === 0 ? (
                          <Badge tone="stone">0 cold</Badge>
                        ) : (
                          <Badge tone="amber">
                            <SunIcon size={10} /> {s.perishableCount} cold — go last
                          </Badge>
                        )}
                        {returns > 0 && <Badge tone="stone">{returns} return{returns > 1 ? 's' : ''}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => move(i, -1)} className="rounded-lg border border-rule-2 px-2 py-0.5 font-mono text-ink-soft active:bg-tint" aria-label="move up">↑</button>
                      <button onClick={() => move(i, 1)} className="rounded-lg border border-rule-2 px-2 py-0.5 font-mono text-ink-soft active:bg-tint" aria-label="move down">↓</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <SectionHeader>Riding along</SectionHeader>
            <div>
              {errands.map((e) => (
                <div key={e.id} className="flex min-h-[44px] items-center gap-3 border-b border-rule py-1.5">
                  <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[2.5px] border-ink" />
                  <span className="flex-1 text-[15px] font-bold">{e.text}</span>
                  <button className="px-2 font-mono text-ink-mute" onClick={() => setErrands(errands.filter((x) => x.id !== e.id))} aria-label={`remove ${e.text}`}>✕</button>
                </div>
              ))}
              <div className="flex gap-2 py-2">
                <input
                  value={errandText}
                  onChange={(e) => setErrandText(e.target.value)}
                  placeholder="e.g. drop off returns, charge batteries"
                  className="min-w-0 flex-1 rounded-[10px] border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold placeholder:text-ink-mute"
                />
                <GhostButton
                  onClick={() => {
                    if (!errandText.trim()) return
                    setErrands([...errands, { id: uid(), text: errandText.trim(), done: false }])
                    setErrandText('')
                  }}
                >
                  Add
                </GhostButton>
              </div>
            </div>

            <PrimaryButton className="mt-4 w-full" onClick={startRun} disabled={stops.length === 0 || mutate.isPending}>
              Start trip → {stops[0]?.store.name ?? ''}
            </PrimaryButton>
          </>
        )}

        {selected === ONLINE && (
          <>
            <SectionHeader>Online · standing list</SectionHeader>
            {onlineItems.length === 0 ? (
              <EmptyState>Standing list is empty.</EmptyState>
            ) : (
              <div>
                {onlineItems.map((it) => (
                  <div key={it.id} className="flex min-h-[54px] items-center gap-2 border-b border-rule py-1.5 pr-1">
                    <button
                      onClick={() => buyOnline(it)}
                      className="flex w-[46px] shrink-0 items-center justify-center self-stretch"
                      aria-label={`mark ${it.name} ordered`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border-[2.5px] border-ink text-transparent active:border-violet-deep active:text-violet-deep">
                        <CheckIcon size={13} />
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold leading-[21px] tracking-tight">{it.name}</p>
                      {it.instruction_note && (
                        <span className="mt-1 inline-block rounded bg-highlight px-1.5 py-px text-[13px] font-bold leading-[18px]">
                          {it.instruction_note}
                        </span>
                      )}
                    </div>
                    {multipleOnlineStores && <Badge tone="stone">{it.store_name}</Badge>}
                    {it.quantity_note && (
                      <span className="font-mono text-[12px] font-bold text-ink-soft">{it.quantity_note}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
