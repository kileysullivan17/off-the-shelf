import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { memberName, storeById, storeLabel } from '../lib/tripLogic'
import { norm, type PurchaseRecord, type Reaction } from '../lib/types'
import { EmptyState, PrimaryButton, Sheet, StarRating, useToast } from '../components/ui'
import { SearchIcon } from '../components/icons'

const REACTION_GLYPH: Record<Reaction, string> = { liked: '▲', disliked: '▼', neutral: '·' }

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

  /** Verdict band: strongest signal first — any dislike wins, then loved. */
  const verdict = (p: PurchaseRecord) => {
    const disliked = p.outcome === 'disliked' || p.reactions.some((r) => r.reaction === 'disliked')
    if (disliked) return 'disliked'
    if (p.outcome === 'loved' || p.reactions.some((r) => r.reaction === 'liked')) return 'loved'
    return null
  }

  return (
    <div>
      {toast}
      <div className="bg-hero px-4 pb-3.5 pt-4 text-paper">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Memory</h1>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-paper px-3.5 py-3 text-ink">
          <SearchIcon size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="have we tried… ramen?"
            className="min-w-0 flex-1 bg-transparent text-[17px] font-bold outline-none placeholder:font-semibold placeholder:text-ink-mute"
          />
          {query && (
            <span className="font-mono text-[11px] font-semibold text-ink-soft">
              {groups.length} tried
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {groups.length === 0 && <EmptyState>No purchases match{query ? ` “${query}”` : ''} yet — first time for everything.</EmptyState>}

        {groups.map((records) => (
          <div key={records[0].item_name}>
            <h2 className="mb-2 px-0.5 text-[17px] font-extrabold capitalize tracking-tight">{records[0].item_name}</h2>
            <div className="space-y-2.5">
              {records.map((p) => {
                const store = storeById(db, p.store_id)
                const v = verdict(p)
                const dislikeNote = p.reactions.find((r) => r.reaction === 'disliked')
                return (
                  <div key={p.id} className="overflow-hidden rounded-xl border-[1.5px] border-rule-2">
                    {v === 'loved' && (
                      <div className="flex items-center gap-2 bg-bought px-3 py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-[.08em] text-paper">
                        ▲ Get again
                      </div>
                    )}
                    {v === 'disliked' && (
                      <div className="flex items-center gap-2 bg-danger px-3 py-1.5 font-mono text-[11px] font-extrabold uppercase tracking-[.06em] text-paper">
                        ▼ Disliked{dislikeNote?.note ? ` — “${dislikeNote.note}”` : ''}
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[.04em] text-ink-soft">
                          {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {store && <> · {storeLabel(db, store)}</>}
                          {p.aisle_code && <> · {p.aisle_code}</>}
                        </p>
                        {p.photo && <img src={p.photo} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                      </div>
                      {p.rating != null && <div className="mt-1"><StarRating value={p.rating} /></div>}
                      {p.note && <p className="mt-1.5 text-sm font-semibold">{p.note}</p>}
                      {p.reactions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {p.reactions.map((r) => (
                            <p key={r.member_id} className="font-mono text-[12px] font-bold">
                              {REACTION_GLYPH[r.reaction]} {memberName(db, r.member_id)?.toUpperCase()}
                              {r.note && <span className="font-semibold text-ink-soft"> — “{r.note}”</span>}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="mt-2.5">
                        <button
                          onClick={() =>
                            setReactSheet({ record: p, member_id: db.members[0]?.id ?? '', reaction: 'liked', note: '' })
                          }
                          className="rounded-full border-[1.5px] border-rule-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.06em] text-ink-soft"
                        >
                          + member reaction
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!reactSheet} onClose={() => setReactSheet(null)} title="Who tried it?">
        {reactSheet && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {db.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setReactSheet({ ...reactSheet, member_id: m.id })}
                  className={`rounded-full px-4 py-2 font-mono text-[12px] font-extrabold uppercase tracking-[.06em] ${
                    reactSheet.member_id === m.id ? 'bg-ink text-paper' : 'border-[1.5px] border-rule-2 text-ink-soft'
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
                  className={`min-h-[48px] flex-1 rounded-xl border-2 px-3 py-3 font-mono text-[12px] font-bold uppercase tracking-[.04em] ${
                    reactSheet.reaction === r ? 'border-violet-deep bg-violet-tint text-violet-deep' : 'border-rule-2 text-ink-soft'
                  }`}
                >
                  {REACTION_GLYPH[r]} {r}
                </button>
              ))}
            </div>
            <input
              value={reactSheet.note}
              onChange={(e) => setReactSheet({ ...reactSheet, note: e.target.value })}
              placeholder='note, e.g. “too spicy”'
              className="w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 text-base font-bold placeholder:font-semibold placeholder:text-ink-mute"
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
