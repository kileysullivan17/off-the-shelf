import { useState } from 'react'
import { useDB, useMutate } from '../lib/store'
import { parseImport, type ParsedLine } from '../lib/importParser'
import { norm, uid, type Item } from '../lib/types'
import { EmptyState, GhostButton, PrimaryButton, useToast } from '../components/ui'

interface ReviewRow extends ParsedLine {
  include: boolean
}

/** Paste import (behavior 9): raw household text in, reviewed items out. */
export function PasteImport() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const [toast, showToast] = useToast()
  const [text, setText] = useState('')
  const [rows, setRows] = useState<ReviewRow[] | null>(null)

  if (!db) return <EmptyState>Loading…</EmptyState>

  const chainNames = [...new Set(db.stores.map((s) => s.name))]

  const parse = () => {
    const parsed = parseImport(text, chainNames)
    setRows(parsed.map((p) => ({ ...p, include: true })))
    if (parsed.length === 0) showToast('Nothing recognizable — try adding store name lines')
  }

  const update = (i: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const save = () => {
    if (!rows) return
    const toSave = rows.filter((r) => r.include && r.name.trim() && r.store_name?.trim())
    const skipped = rows.filter((r) => r.include && (!r.name.trim() || !r.store_name?.trim())).length
    const items: Item[] = toSave.map((r) => ({
      id: uid(),
      name: r.name.trim(),
      store_name: r.store_name!.trim(),
      pinned_store_id: null, // imports default to flexible (D3)
      category: null,
      quantity_note: r.quantity_note,
      heat_safe: false,
      member_id: null,
      staple: false,
      photo: null,
      instruction_note: r.instruction_note,
      photo_requested: false,
      status: 'needed',
      added_at: new Date().toISOString(),
    }))
    mutate.mutate(async (s) => {
      await s.bulkAddItems(items)
      // aisle codes only stick when the chain has exactly one location
      for (const r of toSave) {
        if (!r.aisle_code) continue
        const locations = db.stores.filter((st) => norm(st.name) === norm(r.store_name!))
        if (locations.length === 1) {
          await s.setAisle({
            id: uid(), store_id: locations[0].id, item_name: norm(r.name),
            code: r.aisle_code, confirmed_at: new Date().toISOString(),
          })
        }
      }
    })
    setRows(null)
    setText('')
    showToast(`${items.length} items added${skipped ? ` · ${skipped} skipped (no store)` : ''} ✓`)
  }

  const cell = 'w-full rounded-lg border-[1.5px] border-rule-2 bg-paper px-2 py-1.5 font-mono text-[13px] font-semibold placeholder:text-ink-mute'

  return (
    <div>
      {toast}
      <div className="border-b border-rule px-4 pb-3.5 pt-4">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Paste a list</h1>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
          Texts, notes, transcripts — anything
        </p>
      </div>

      <div className="px-4 py-4">
        {!rows && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={'Target\n* bibs G37\nmilk x 2\nsunscreen (reef-safe only)\n\nKTA\npoi\nramen x4 (not the spicy one)'}
              className="w-full rounded-xl border-2 border-ink bg-paper p-3.5 font-mono text-sm font-medium leading-6 placeholder:text-ink-mute"
            />
            <PrimaryButton className="mt-3 w-full" onClick={parse} disabled={!text.trim()}>
              Parse {text.trim() ? `${text.trim().split('\n').filter(Boolean).length} lines` : 'it'} →
            </PrimaryButton>
          </>
        )}

        {rows && (
          <>
            <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[.06em] text-ink-soft">
              Check my guesses — {rows.filter((r) => r.include).length} of {rows.length} selected · nothing saves until you say so
            </p>
            <div className="space-y-2.5">
              {rows.map((r, i) => (
                <div key={i} className={`rounded-xl border-[1.5px] border-rule-2 p-3 ${r.include ? '' : 'opacity-50'}`}>
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => update(i, { include: e.target.checked })}
                      className="mt-1.5 h-5 w-5 accent-violet"
                    />
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                      <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className={`${cell} col-span-2 font-sans text-[15px] font-bold`} />
                      <input
                        value={r.store_name ?? ''}
                        onChange={(e) => update(i, { store_name: e.target.value })}
                        list="import-chains"
                        placeholder="store?"
                        className={`${cell} ${!r.store_name ? 'border-dashed border-danger-border bg-danger-tint' : ''}`}
                      />
                      <input value={r.quantity_note ?? ''} onChange={(e) => update(i, { quantity_note: e.target.value || null })} placeholder="qty" className={cell} />
                      <input value={r.aisle_code ?? ''} onChange={(e) => update(i, { aisle_code: e.target.value || null })} placeholder="aisle" className={cell} />
                      <input value={r.instruction_note ?? ''} onChange={(e) => update(i, { instruction_note: e.target.value || null })} placeholder="note" className={cell} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <datalist id="import-chains">
              {chainNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            <p className="mt-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-ink-soft">
              Dashed = my guess · fix now or in aisle
            </p>
            <div className="mt-2 flex gap-2">
              <GhostButton className="flex-1" onClick={() => setRows(null)}>← Edit text</GhostButton>
              <PrimaryButton className="flex-1" onClick={save}>
                Save {rows.filter((r) => r.include).length} items
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
