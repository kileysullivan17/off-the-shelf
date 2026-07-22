import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { memberName, storeById, storeLabel } from '../lib/tripLogic'
import { norm, type PurchaseRecord, type Reaction } from '../lib/types'
import { Badge, Card, EmptyState, GhostButton, PrimaryButton, Sheet, StarRating, useToast } from '../components/ui'

const OUTCOME_BADGE = {
  loved: { tone: 'green' as const, label: '❤️ loved' },
  bought: { tone: 'stone' as const, label: 'bought' },
  disliked: { tone: 'red' as const, label: '👎 disliked' },
}

const REACTION_EMOJI: Record<Reaction, string> = { liked: '👍', disliked: '👎', neutral: '😐' }

/** Purchase memory (behavior 5): what was tried, when, where, who thought what. */
export function History() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const [toast, showToast] = useToast()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [reactSheet, setReactSheet] = useState<{
    record: PurchaseRecord; member_id: string; reaction: Reaction; note: string
  } | null>(null)

  const groups = useMemo(() => {
    if (!db) return []
    const q = norm(query)
    const map = new Map<string, PurchaseRecord[]>()
    for (const p of db.purchases) {
      if (q && !norm(p.item_name).includes(q)) continue
      const key = norm(p.item_name)
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return [...map.values()]
      .map((records) => records.sort((a, b) => b.date.localeCompare(a.date)))
      .sort((a, b) => b[0].date.localeCompare(a[0].date))
  }, [db, query])

  if (!db) return <EmptyState>Loading…</EmptyState>

  const saveReaction = () => {
    if (!reactSheet) return
    const { record, member_id, reaction, note } = reactSheet
    const reactions = [
      ...record.reactions.filter((r) => r.member_id !== member_id),
      { member_id, reaction, note: note.trim() || null },
    ]
    mutate.mutate((s) => s.addPurchase({ ...record, reactions }))
    setReactSheet(null)
    showToast('Reaction saved ✓')
  }

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-1 text-2xl font-bold">History</h1>
      <p className="mb-3 text-sm text-stone-500">The household memory — search before you grab.</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔎 e.g. ramen"
        className="mb-4 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
      />

      {groups.length === 0 && <EmptyState>No purchases match{query ? ` “${query}”` : ''} yet.</EmptyState>}

      {groups.map((records) => (
        <div key={records[0].item_name} className="mb-5">
          <h2 className="mb-2 px-1 text-lg font-bold capitalize">{records[0].item_name}</h2>
          <div className="space-y-2">
            {records.map((p) => {
              const store = storeById(db, p.store_id)
              const badge = OUTCOME_BADGE[p.outcome]
              return (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-stone-600">
                        {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {store && <> · {storeLabel(db, store)}</>}
                        {p.aisle_code && <> · aisle {p.aisle_code}</>}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {p.rating != null && <StarRating value={p.rating} />}
                      </div>
                    </div>
                    {p.photo && <img src={p.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  </div>
                  {p.note && <p className="mt-1.5 text-sm text-stone-700">{p.note}</p>}
                  {p.reactions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {p.reactions.map((r) => (
                        <p key={r.member_id} className="text-sm">
                          {REACTION_EMOJI[r.reaction]} <span className="font-semibold">{memberName(db, r.member_id)}</span>
                          {r.note && <span className="text-stone-600"> — {r.note}</span>}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    <GhostButton
                      onClick={() =>
                        setReactSheet({ record: p, member_id: db.members[0]?.id ?? '', reaction: 'liked', note: '' })
                      }
                      className="!py-1.5 text-xs"
                    >
                      + member reaction
                    </GhostButton>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      <Sheet open={!!reactSheet} onClose={() => setReactSheet(null)} title="Who tried it?">
        {reactSheet && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {db.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setReactSheet({ ...reactSheet, member_id: m.id })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    reactSheet.member_id === m.id ? 'bg-brand-700 text-white' : 'border border-stone-300 bg-white'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['liked', 'disliked', 'neutral'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setReactSheet({ ...reactSheet, reaction: r })}
                  className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${
                    reactSheet.reaction === r ? 'border-brand-700 bg-brand-50' : 'border-stone-300 bg-white'
                  }`}
                >
                  {REACTION_EMOJI[r]} {r}
                </button>
              ))}
            </div>
            <input
              value={reactSheet.note}
              onChange={(e) => setReactSheet({ ...reactSheet, note: e.target.value })}
              placeholder='note, e.g. “too spicy”'
              className="w-full rounded-xl border border-stone-300 px-3 py-3"
            />
            <PrimaryButton className="w-full" onClick={saveReaction} disabled={!reactSheet.member_id}>
              Save reaction
            </PrimaryButton>
          </div>
        )}
      </Sheet>
    </div>
  )
}
