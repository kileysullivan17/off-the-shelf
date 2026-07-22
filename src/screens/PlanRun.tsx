import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { activeTrip, assembleRun, pendingReturnsForStore, type PlannedStop } from '../lib/tripLogic'
import { norm, uid, type Errand, type Item } from '../lib/types'
import { Badge, Card, EmptyState, GhostButton, PrimaryButton, SectionHeader, useToast } from '../components/ui'

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

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-1 text-2xl font-bold">Plan a run</h1>
      <p className="mb-4 text-sm text-stone-500">
        Pick a city — stops are ordered heat-safe first, perishables last. Or tap Online for standing orders.
      </p>

      {current && (
        <Link to={`/trip/${current.id}`}>
          <Card className="mb-4 border-brand-600 bg-brand-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-brand-800">
                  Trip in progress — {db.cities.find((c) => c.id === current.city_id)?.name}
                </p>
                <p className="text-sm text-stone-600">{current.stops.length} stops · tap to resume</p>
              </div>
              <span className="text-2xl">🛒</span>
            </div>
          </Card>
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {db.cities.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold ${
              selected === c.id ? 'bg-brand-700 text-white' : 'bg-white border border-stone-300 text-stone-700'
            }`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setSelected(ONLINE)}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold ${
            selected === ONLINE ? 'bg-brand-700 text-white' : 'bg-white border border-stone-300 text-stone-700'
          }`}
        >
          🌐 Online
        </button>
      </div>

      {cityId && (
        <>
          <SectionHeader>The run · {stops.length} stops</SectionHeader>
          {stops.length === 0 && <EmptyState>Nothing needed in this city right now.</EmptyState>}
          <div className="space-y-2">
            {stops.map((s, i) => {
              const returns = pendingReturnsForStore(db, s.store.id).length
              return (
                <Card key={s.store.id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-center text-lg font-bold text-stone-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.store.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <Badge tone="stone">{s.items.length} items</Badge>
                      {s.perishableCount === 0 ? (
                        <Badge tone="green">all heat-safe</Badge>
                      ) : (
                        <Badge tone="amber">{s.perishableCount} perishable</Badge>
                      )}
                      {returns > 0 && <Badge tone="red">{returns} return{returns > 1 ? 's' : ''}</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => move(i, -1)} className="rounded-lg border border-stone-200 px-2 py-0.5 text-stone-500 active:bg-stone-100" aria-label="move up">↑</button>
                    <button onClick={() => move(i, 1)} className="rounded-lg border border-stone-200 px-2 py-0.5 text-stone-500 active:bg-stone-100" aria-label="move down">↓</button>
                  </div>
                </Card>
              )
            })}
          </div>

          <SectionHeader>Errands on this run</SectionHeader>
          <Card className="p-3">
            {errands.map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-1">
                <span className="flex-1 text-sm">{e.text}</span>
                <button className="text-stone-400" onClick={() => setErrands(errands.filter((x) => x.id !== e.id))}>✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={errandText}
                onChange={(e) => setErrandText(e.target.value)}
                placeholder="e.g. drop off returns, charge batteries"
                className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
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
          </Card>

          <PrimaryButton className="mt-4 w-full" onClick={startRun} disabled={stops.length === 0 || mutate.isPending}>
            Start run → {stops[0]?.store.name ?? ''}
          </PrimaryButton>
        </>
      )}

      {selected === ONLINE && (
        <>
          <SectionHeader>Online · standing list</SectionHeader>
          {onlineItems.length === 0 ? (
            <EmptyState>Standing list is empty.</EmptyState>
          ) : (
            <Card>
              {onlineItems.map((it, i) => (
                <div key={it.id} className={`flex items-center gap-3 px-3 py-3 ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                  <button
                    onClick={() => buyOnline(it)}
                    className="h-7 w-7 shrink-0 rounded-full border-2 border-stone-300 text-transparent active:border-brand-600"
                    aria-label={`mark ${it.name} ordered`}
                  >
                    ✓
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{it.name}</p>
                    {it.instruction_note && <p className="text-xs text-amber-700">{it.instruction_note}</p>}
                  </div>
                  {multipleOnlineStores && <Badge tone="stone">{it.store_name}</Badge>}
                  {it.quantity_note && <Badge tone="stone">{it.quantity_note}</Badge>}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
