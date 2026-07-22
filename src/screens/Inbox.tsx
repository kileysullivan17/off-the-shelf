import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB, useMutate } from '../lib/store'
import { storeById, storeLabel } from '../lib/tripLogic'
import { uid } from '../lib/types'
import { Badge, EmptyState, GhostButton, PhotoInput, PrimaryButton, SectionHeader, useToast } from '../components/ui'
import { CameraIcon } from '../components/icons'

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

  const input = 'w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 text-base font-bold placeholder:font-semibold placeholder:text-ink-mute'

  const tabBtn = (t: typeof tab, label: string, count: number) => (
    <button
      onClick={() => setTab(t)}
      className={`flex-1 rounded-full px-3 py-2.5 font-mono text-[12px] font-extrabold uppercase tracking-[.06em] ${
        tab === t ? 'bg-ink text-paper' : 'border-[1.5px] border-rule-2 text-ink-soft'
      }`}
    >
      {label}{count > 0 && ` · ${count}`}
    </button>
  )

  return (
    <div>
      {toast}
      <div className="border-b border-rule px-4 pb-3.5 pt-4">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Questions & returns</h1>
        <div className="mt-3 flex gap-2">
          {tabBtn('questions', 'Questions', openQ)}
          {tabBtn('returns', 'Returns', pendingR)}
        </div>
      </div>

      <div className="px-4 pb-4">
        {tab === 'questions' && (
          <>
            {questions.length === 0 && <EmptyState>No questions yet.</EmptyState>}
            <div className="mt-4 space-y-3">
              {questions.map((q) => {
                const store = storeById(db, q.store_id)
                const item = db.items.find((i) => i.id === q.item_id)
                return (
                  <div key={q.id}>
                    {/* question bubble — the asking side */}
                    <div className="max-w-[300px] overflow-hidden rounded-[14px] rounded-bl-[4px] border-[1.5px] border-rule-2">
                      {q.photo && <img src={q.photo} alt="question" className="max-h-44 w-full object-cover" />}
                      <div className="px-3.5 py-2.5">
                        <p className="text-[15px] font-bold leading-5">{q.text}</p>
                        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-ink-soft">
                          {store ? storeLabel(db, store) : 'no store'} ·{' '}
                          {new Date(q.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {item && (
                            <> · <Link className="text-violet-deep underline" to={`/history?q=${encodeURIComponent(item.name)}`}>{item.name}</Link></>
                          )}
                          {q.status === 'open' && <> · <span className="text-magenta-ink">open</span></>}
                        </p>
                      </div>
                    </div>
                    {q.status === 'answered' ? (
                      /* answer bubble — ink, from the other member */
                      <div className="ml-auto mt-2 max-w-[300px] rounded-[14px] rounded-br-[4px] bg-ink px-3.5 py-2.5">
                        <p className="text-[15px] font-bold leading-5 text-paper">{q.answer}</p>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={answers[q.id] ?? ''}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="answer…"
                          className="min-w-0 flex-1 rounded-[10px] border-2 border-ink bg-paper px-3 py-2 text-sm font-bold placeholder:font-semibold placeholder:text-ink-mute"
                        />
                        <GhostButton onClick={() => answer(q.id)}>Send</GhostButton>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <SectionHeader>Ask from home</SectionHeader>
            <div className="space-y-3 pt-1">
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="question for the shopper…"
                className={input}
              />
              <div className="flex items-center gap-2">
                <select
                  value={qStore}
                  onChange={(e) => setQStore(e.target.value)}
                  className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-rule-2 bg-paper px-3 py-2.5 font-mono text-[12px] font-bold text-ink-soft"
                >
                  <option value="">Store (optional)</option>
                  {db.stores.map((s) => <option key={s.id} value={s.id}>{storeLabel(db, s)}</option>)}
                </select>
                <PhotoInput label="Pic" onPhoto={setQPhoto} />
                {qPhoto && <img src={qPhoto} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              </div>
              <PrimaryButton className="w-full" onClick={askQuestion}>Post question</PrimaryButton>
            </div>
            <p className="mt-3 flex items-start gap-1.5 px-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.04em] text-ink-soft">
              <CameraIcon size={12} className="mt-px" />
              <span>To request a photo of a list item, flag “ask shopper for a photo” on the item — the picture lands back on that thread.</span>
            </p>
          </>
        )}

        {tab === 'returns' && (
          <>
            {returns.length === 0 && <EmptyState>No returns tracked.</EmptyState>}
            <div className="mt-2">
              {returns.map((r) => {
                const store = storeById(db, r.store_id)
                return (
                  <div key={r.id} className={`flex min-h-[56px] items-center gap-3 border-b border-rule py-2 ${r.status === 'done' ? 'opacity-55' : ''}`}>
                    <span className={`h-6 w-6 shrink-0 rounded-full border-[2.5px] ${r.status === 'done' ? 'border-bought bg-bought' : 'border-ink'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-bold tracking-tight ${r.status === 'done' ? 'line-through decoration-2' : ''}`}>{r.item_name}</p>
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[.04em] text-ink-soft">
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
                  </div>
                )
              })}
            </div>

            <SectionHeader>Add a return</SectionHeader>
            <div className="space-y-3 pt-1">
              <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="item to return" className={input} />
              <select value={rStore} onChange={(e) => setRStore(e.target.value)} className={input}>
                <option value="">Which store location?</option>
                {db.stores.filter((s) => s.city_id).map((s) => (
                  <option key={s.id} value={s.id}>{storeLabel(db, s)}</option>
                ))}
              </select>
              <input value={rReason} onChange={(e) => setRReason(e.target.value)} placeholder="reason (optional)" className={input} />
              <PrimaryButton className="w-full" onClick={addReturn} disabled={!rName.trim() || !rStore}>
                Track return
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
