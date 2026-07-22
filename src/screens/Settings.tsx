import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDB, useMutate, useStore } from '../lib/store'
import { isAuthCapable } from '../lib/store/DataStore'
import { uid } from '../lib/types'
import { Badge, Card, EmptyState, GhostButton, PrimaryButton, SectionHeader, useToast } from '../components/ui'

export function Settings() {
  const { data: db } = useDB()
  const store = useStore()
  const mutate = useMutate()
  const qc = useQueryClient()
  const [toast, showToast] = useToast()
  const [names, setNames] = useState<Record<string, string>>({})
  const [newCity, setNewCity] = useState({ name: '', island_id: '' })
  const [newStore, setNewStore] = useState({ name: '', city_id: '', note: '' })

  if (!db) return <EmptyState>Loading…</EmptyState>

  const input = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5'

  const saveMembers = () => {
    mutate.mutate(async (s) => {
      for (const m of db.members) {
        const name = names[m.id]?.trim()
        if (name && name !== m.name) await s.updateMember({ ...m, name })
      }
    })
    showToast('Members saved ✓')
  }

  const addCity = () => {
    if (!newCity.name.trim() || !newCity.island_id) return
    mutate.mutate((s) => s.upsertCity({ id: uid(), name: newCity.name.trim(), island_id: newCity.island_id }))
    setNewCity({ name: '', island_id: '' })
    showToast('City added ✓')
  }

  const addStore = () => {
    if (!newStore.name.trim() || !newStore.city_id) return
    mutate.mutate((s) =>
      s.upsertStore({
        id: uid(), name: newStore.name.trim(),
        city_id: newStore.city_id === 'online' ? null : newStore.city_id,
        location_note: newStore.note.trim() || null,
      }),
    )
    setNewStore({ name: '', city_id: '', note: '' })
    showToast('Store added ✓')
  }

  const reset = () => {
    if (!confirm('Reset all data back to the demo seed?')) return
    mutate.mutate(async (s) => {
      await s.resetToSeed()
      await qc.invalidateQueries()
    })
    showToast('Demo data restored ✓')
  }

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>

      <SectionHeader>Household members</SectionHeader>
      <Card className="space-y-2 p-3">
        {db.members.map((m) => (
          <input
            key={m.id}
            defaultValue={m.name}
            onChange={(e) => setNames((n) => ({ ...n, [m.id]: e.target.value }))}
            className={input}
            aria-label={`rename ${m.name}`}
          />
        ))}
        <PrimaryButton className="w-full" onClick={saveMembers}>Save names</PrimaryButton>
      </Card>

      <SectionHeader>Stores & cities</SectionHeader>
      {db.islands.map((isl) => {
        const cities = db.cities.filter((c) => c.island_id === isl.id)
        return (
          <Card key={isl.id} className="mb-3 p-3">
            <p className="font-semibold">{isl.name}</p>
            {cities.length === 0 && <p className="mt-1 text-sm text-stone-500">No cities yet.</p>}
            {cities.map((c) => (
              <div key={c.id} className="mt-2">
                <p className="text-sm font-medium text-stone-600">{c.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {db.stores.filter((s) => s.city_id === c.id).map((s) => (
                    <Badge key={s.id} tone="stone">
                      {s.name}{s.location_note ? ` (${s.location_note})` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )
      })}
      <Card className="mb-3 p-3">
        <p className="font-semibold">Online</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {db.stores.filter((s) => !s.city_id).map((s) => (
            <Badge key={s.id} tone="stone">{s.name}</Badge>
          ))}
        </div>
      </Card>

      <Card className="space-y-2 p-3">
        <p className="text-sm font-semibold text-stone-600">Add a city</p>
        <div className="flex gap-2">
          <input value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} placeholder="city name" className={input} />
          <select value={newCity.island_id} onChange={(e) => setNewCity({ ...newCity, island_id: e.target.value })} className={input}>
            <option value="">island…</option>
            {db.islands.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <GhostButton className="w-full" onClick={addCity}>+ Add city</GhostButton>

        <p className="pt-2 text-sm font-semibold text-stone-600">Add a store (a store = name + city)</p>
        <input value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} placeholder="store name, e.g. Longs" className={input} />
        <div className="flex gap-2">
          <select value={newStore.city_id} onChange={(e) => setNewStore({ ...newStore, city_id: e.target.value })} className={input}>
            <option value="">city…</option>
            {db.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="online">Online (no city)</option>
          </select>
          <input value={newStore.note} onChange={(e) => setNewStore({ ...newStore, note: e.target.value })} placeholder="location note" className={input} />
        </div>
        <GhostButton className="w-full" onClick={addStore}>+ Add store</GhostButton>
      </Card>

      <SectionHeader>Data</SectionHeader>
      <Card className="space-y-3 p-3">
        <p className="text-sm">
          Mode:{' '}
          {store.mode === 'local' ? (
            <Badge tone="amber">local demo (this device only)</Badge>
          ) : (
            <Badge tone="green">Supabase connected</Badge>
          )}
        </p>
        <p className="text-xs text-stone-500">
          To go live: create a Supabase project, run <code>supabase/schema.sql</code>, then set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>. Every
          household device signs into the one shared account (v1 — see DECISIONS.md).
        </p>
        <GhostButton className="w-full" onClick={reset}>↺ Reset demo data</GhostButton>
        {isAuthCapable(store) && (
          <GhostButton className="w-full" onClick={() => isAuthCapable(store) && store.signOut()}>
            ⎋ Sign out of this device
          </GhostButton>
        )}
      </Card>
    </div>
  )
}
