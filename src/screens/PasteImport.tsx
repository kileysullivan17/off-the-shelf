import { useState } from 'react'
import { useDB, useMutate } from '../lib/store'
import { parseImport, type ParsedLine } from '../lib/importParser'
import { norm, uid, type Item } from '../lib/types'
import { Card, EmptyState, GhostButton, PrimaryButton, useToast } from '../components/ui'

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

  const input = 'w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm'

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-1 text-2xl font-bold">Paste import</h1>
      <p className="mb-4 text-sm text-stone-500">
        Paste the raw list — store lines, * and x markers, “x 2”, aisle codes, (notes) all understood.
      </p>

      {!rows && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={'Target\n* bibs G37\nmilk x 2\nsunscreen (reef-safe only)\n\nKTA\npoi\nramen x4 (not the spicy one)'}
            className="w-full rounded-2xl border border-stone-300 bg-white p-3 font-mono text-sm"
          />
          <PrimaryButton className="mt-3 w-full" onClick={parse} disabled={!text.trim()}>
            Parse it →
          </PrimaryButton>
        </>
      )}

      {rows && (
        <>
          <p className="mb-2 text-sm font-medium text-stone-600">
            Review — {rows.filter((r) => r.include).length} of {rows.length} selected
          </p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <Card key={i} className={`p-3 ${r.include ? '' : 'opacity-50'}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => update(i, { include: e.target.checked })}
                    className="mt-1.5 h-5 w-5 accent-teal-700"
                  />
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                    <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className={`${input} col-span-2 font-medium`} />
                    <input
                      value={r.store_name ?? ''}
                      onChange={(e) => update(i, { store_name: e.target.value })}
                      list="import-chains"
                      placeholder="store?"
                      className={`${input} ${!r.store_name ? 'border-red-300 bg-red-50' : ''}`}
                    />
                    <input value={r.quantity_note ?? ''} onChange={(e) => update(i, { quantity_note: e.target.value || null })} placeholder="qty" className={input} />
                    <input value={r.aisle_code ?? ''} onChange={(e) => update(i, { aisle_code: e.target.value || null })} placeholder="aisle" className={input} />
                    <input value={r.instruction_note ?? ''} onChange={(e) => update(i, { instruction_note: e.target.value || null })} placeholder="note" className={input} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <datalist id="import-chains">
            {chainNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          <div className="mt-3 flex gap-2">
            <GhostButton className="flex-1" onClick={() => setRows(null)}>← Edit text</GhostButton>
            <PrimaryButton className="flex-1" onClick={save}>Add items</PrimaryButton>
          </div>
        </>
      )}
    </div>
  )
}
