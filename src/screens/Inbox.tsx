import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { storeById, storeLabel } from '../lib/tripLogic'
import { uid } from '../lib/types'
import { Badge, Card, EmptyState, GhostButton, PhotoInput, PrimaryButton, SectionHeader, useToast } from '../components/ui'

/**
 * Questions & returns review (behaviors 6 & 7) — both directions of the
 * photo/question flow land here, plus the returns ledger.
 */
export function Inbox() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const [toast, showToast] = useToast()
  const [tab, setTab] = useState<'questions' | 'returns'>('questions')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // ask-from-home composer
  const [qText, setQText] = useState('')
  const [qPhoto, setQPhoto] = useState<string | null>(null)
  const [qStore, setQStore] = useState('')

  // new return form
  const [rName, setRName] = useState('')
  const [rStore, setRStore] = useState('')
  const [rReason, setRReason] = useState('')

  if (!db) return <EmptyState>Loading…</EmptyState>

  const questions = [...db.questions].sort(
    (a, b) => (a.status === b.status ? b.created_at.localeCompare(a.created_at) : a.status === 'open' ? -1 : 1),
  )
  const returns = [...db.returns].sort((a) => (a.status === 'pending' ? -1 : 1))
  const openQ = db.questions.filter((q) => q.status === 'open').length
  const pendingR = db.returns.filter((r) => r.status === 'pending').length

  const answer = (id: string) => {
    const q = db.questions.find((x) => x.id === id)
    const text = answers[id]?.trim()
    if (!q || !text) return
    mutate.mutate((s) => s.upsertQuestion({ ...q, status: 'answered', answer: text }))
    showToast('Answered ✓')
  }

  const askQuestion = () => {
    if (!qText.trim() && !qPhoto) return
    mutate.mutate((s) =>
      s.upsertQuestion({
        id: uid(), photo: qPhoto, text: qText.trim() || '(photo)', store_id: qStore || null,
        item_id: null, status: 'open', answer: null, created_at: new Date().toISOString(),
      }),
    )
    setQText(''); setQPhoto(null); setQStore('')
    showToast('Question posted ✓')
  }

  const addReturn = () => {
    if (!rName.trim() || !rStore) return
    mutate.mutate((s) =>
      s.upsertReturn({ id: uid(), item_name: rName.trim(), store_id: rStore, reason: rReason.trim() || null, status: 'pending' }),
    )
    setRName(''); setRReason('')
    showToast('Return added — it will surface on the next trip there ✓')
  }

  const tabBtn = (t: typeof tab, label: string, count: number) => (
    <button
      onClick={() => setTab(t)}
      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
        tab === t ? 'bg-brand-700 text-white' : 'bg-white border border-stone-300 text-stone-600'
      }`}
    >
      {label}{count > 0 && ` (${count})`}
    </button>
  )

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-4 text-2xl font-bold">Questions & returns</h1>
      <div className="mb-4 flex gap-2">
        {tabBtn('questions', '💬 Questions', openQ)}
        {tabBtn('returns', '↩︎ Returns', pendingR)}
      </div>

      {tab === 'questions' && (
        <>
          {questions.length === 0 && <EmptyState>No questions yet.</EmptyState>}
          <div className="space-y-3">
            {questions.map((q) => {
              const store = storeById(db, q.store_id)
              const item = db.items.find((i) => i.id === q.item_id)
              return (
                <Card key={q.id} className="p-3">
                  <div className="flex gap-3">
                    {q.photo && <img src={q.photo} alt="question" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{q.text}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {store ? storeLabel(db, store) : 'no store'} ·{' '}
                        {new Date(q.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {item && (
                          <> · <Link className="text-brand-700 underline" to={`/history?q=${encodeURIComponent(item.name)}`}>{item.name}</Link></>
                        )}
                      </p>
                      {q.status === 'answered' ? (
                        <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-sm text-emerald-800">✓ {q.answer}</p>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <input
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            placeholder="answer…"
                            className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                          />
                          <GhostButton onClick={() => answer(q.id)}>Send</GhostButton>
                        </div>
                      )}
                    </div>
                    {q.status === 'open' && <Badge tone="amber">open</Badge>}
                  </div>
                </Card>
              )
            })}
          </div>

          <SectionHeader>Ask from home</SectionHeader>
          <Card className="space-y-3 p-3">
            <input
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="question for the shopper…"
              className="w-full rounded-xl border border-stone-300 px-3 py-3"
            />
            <div className="flex items-center gap-2">
              <select value={qStore} onChange={(e) => setQStore(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Store (optional)</option>
                {db.stores.map((s) => <option key={s.id} value={s.id}>{storeLabel(db, s)}</option>)}
              </select>
              <PhotoInput label="📷" onPhoto={setQPhoto} />
              {qPhoto && <img src={qPhoto} alt="" className="h-10 w-10 rounded-lg object-cover" />}
            </div>
            <PrimaryButton className="w-full" onClick={askQuestion}>Post question</PrimaryButton>
          </Card>
          <p className="mt-2 px-1 text-xs text-stone-500">
            Tip: to request a photo of a specific list item, flag “📷 ask shopper for a photo” on the item — the shopper’s
            picture lands back here on that item’s thread.
          </p>
        </>
      )}

      {tab === 'returns' && (
        <>
          {returns.length === 0 && <EmptyState>No returns tracked.</EmptyState>}
          <div className="space-y-2">
            {returns.map((r) => {
              const store = storeById(db, r.store_id)
              return (
                <Card key={r.id} className={`flex items-center gap-3 p-3 ${r.status === 'done' ? 'opacity-60' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${r.status === 'done' ? 'line-through' : ''}`}>{r.item_name}</p>
                    <p className="text-xs text-stone-500">
                      {store ? storeLabel(db, store) : '?'}{r.reason && <> — {r.reason}</>}
                    </p>
                  </div>
                  {r.status === 'pending' ? (
                    <GhostButton onClick={() => mutate.mutate((s) => s.upsertReturn({ ...r, status: 'done' }))}>
                      Done ✓
                    </GhostButton>
                  ) : (
                    <Badge tone="green">done</Badge>
                  )}
                </Card>
              )
            })}
          </div>

          <SectionHeader>Add a return</SectionHeader>
          <Card className="space-y-3 p-3">
            <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="item to return" className="w-full rounded-xl border border-stone-300 px-3 py-3" />
            <select value={rStore} onChange={(e) => setRStore(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3">
              <option value="">Which store location?</option>
              {db.stores.filter((s) => s.city_id).map((s) => (
                <option key={s.id} value={s.id}>{storeLabel(db, s)}</option>
              ))}
            </select>
            <input value={rReason} onChange={(e) => setRReason(e.target.value)} placeholder="reason (optional)" className="w-full rounded-xl border border-stone-300 px-3 py-3" />
            <PrimaryButton className="w-full" onClick={addReturn} disabled={!rName.trim() || !rStore}>
              Track return
            </PrimaryButton>
          </Card>
        </>
      )}
    </div>
  )
}
