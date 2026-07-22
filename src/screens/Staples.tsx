import { useDB, useMutate } from '../lib/store'
import { memberName } from '../lib/tripLogic'
import type { Item } from '../lib/types'
import { EmptyState, useToast } from '../components/ui'
import { CheckIcon, PlusIcon } from '../components/icons'

/** One-tap re-add of household staples (behavior 4). */
export function Staples() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const [toast, showToast] = useToast()

  if (!db) return <EmptyState>Loading…</EmptyState>

  const staples = db.items.filter((i) => i.staple)
  const needsAdding = (i: Item) => i.status !== 'needed' && i.status !== 'in_cart'
  const missing = staples.filter(needsAdding)

  const byStore = new Map<string, Item[]>()
  for (const s of staples) {
    const list = byStore.get(s.store_name) ?? []
    list.push(s)
    byStore.set(s.store_name, list)
  }

  const readd = (item: Item) => {
    mutate.mutate((s) => s.upsertItem({ ...item, status: 'needed' }))
    showToast(`${item.name} back on the list ✓`)
  }

  const readdAll = () => {
    mutate.mutate(async (s) => {
      for (const item of missing) await s.upsertItem({ ...item, status: 'needed' })
    })
    showToast(`${missing.length} staples re-added ✓`)
  }

  return (
    <div>
      {toast}
      <div className="border-b border-rule px-4 pb-3.5 pt-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Staples</h1>
          {missing.length > 0 && (
            <button
              onClick={readdAll}
              className="rounded-full border-[1.5px] border-rule-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[.04em] text-ink-soft"
            >
              Re-add all ({missing.length})
            </button>
          )}
        </div>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
          Tap a cell → back on its store’s list
        </p>
      </div>

      <div className="px-4 pb-4">
        {staples.length === 0 && <EmptyState>No staples yet — mark items as staples when adding.</EmptyState>}

        {[...byStore.entries()].map(([storeName, items]) => (
          <div key={storeName} className="mt-4">
            <h2 className="mb-2 px-0.5 font-mono text-[11px] font-bold uppercase tracking-[.1em] text-ink-soft">{storeName}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item) => {
                const member = memberName(db, item.member_id)
                const onList = !needsAdding(item)
                return onList ? (
                  <div key={item.id} className="min-h-[74px] rounded-xl bg-ink p-3">
                    <p className="text-[15px] font-extrabold leading-[19px] tracking-tight text-paper">{item.name}</p>
                    <p className="mt-2 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[.06em] text-lavender">
                      <CheckIcon size={10} /> in list
                    </p>
                  </div>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => readd(item)}
                    className="relative min-h-[74px] rounded-xl border-[1.5px] border-rule-2 p-3 text-left active:bg-tint"
                  >
                    <p className="text-[15px] font-extrabold leading-[19px] tracking-tight">{item.name}</p>
                    <p className="mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.04em] text-ink-soft">
                      {item.status === 'parked' ? 'parked' : member || ' '}
                    </p>
                    <span className="absolute bottom-2.5 right-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-lg border-2 border-ink">
                      <PlusIcon size={13} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
