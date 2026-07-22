import { useDB, useMutate } from '../lib/store'
import { memberName } from '../lib/tripLogic'
import type { Item } from '../lib/types'
import { Badge, Card, EmptyState, PrimaryButton, useToast } from '../components/ui'

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
    <div className="p-4">
      {toast}
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staples</h1>
        {missing.length > 0 && (
          <button onClick={readdAll} className="text-sm font-semibold text-brand-700">
            Re-add all ({missing.length})
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-stone-500">One tap puts a staple back on the needed list.</p>

      {staples.length === 0 && <EmptyState>No staples yet — mark items as staples when adding.</EmptyState>}

      {[...byStore.entries()].map(([storeName, items]) => (
        <div key={storeName} className="mb-4">
          <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-stone-500">{storeName}</h2>
          <Card>
            {items.map((item, i) => {
              const member = memberName(db, item.member_id)
              const onList = !needsAdding(item)
              return (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-3 ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {member && <Badge tone="teal">{member}</Badge>}
                      {item.status === 'parked' && <Badge tone="stone">parked</Badge>}
                    </div>
                  </div>
                  {onList ? (
                    <Badge tone="green">on the list ✓</Badge>
                  ) : (
                    <PrimaryButton onClick={() => readd(item)} className="!px-3 !py-2 text-sm">+ Add</PrimaryButton>
                  )}
                </div>
              )
            })}
          </Card>
        </div>
      ))}
    </div>
  )
}
