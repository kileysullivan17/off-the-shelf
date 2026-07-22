import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDB, useMutate, useStore } from '../lib/store'
import { isAuthCapable } from '../lib/store/DataStore'
import { uid } from '../lib/types'
import { Badge, EmptyState, GhostButton, PrimaryButton, SectionHeader, useToast } from '../components/ui'

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

  const input = 'w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-2.5 text-base font-bold placeholder:font-semibold placeholder:text-ink-mute'

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
    <div>
      {toast}
      <div className="bg-hero px-4 pb-3.5 pt-4 text-paper">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Settings</h1>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.06em]">
          One account · one household
        </p>
      </div>

      <div className="px-4 pb-4">
        <SectionHeader>Members</SectionHeader>
        <div className="space-y-2 pt-1">
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
        </div>

        <SectionHeader>Stores — by city</SectionHeader>
        {db.islands.map((isl) => {
          const cities = db.cities.filter((c) => c.island_id === isl.id)
          return (
            <div key={isl.id} className="pt-1">
              <p className="px-0.5 font-mono text-[12px] font-bold uppercase tracking-[.08em] text-ink-soft">{isl.name}</p>
              {cities.length === 0 && <p className="mt-1 text-sm font-semibold text-ink-soft">No cities yet.</p>}
              {cities.map((c) => (
                <div key={c.id} className="mt-2 border-b border-rule pb-2.5">
                  <p className="text-base font-extrabold tracking-tight">{c.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {db.stores.filter((s) => s.city_id === c.id).map((s) => (
                      <Badge key={s.id} tone="stone">
                        {s.name}{s.location_note ? ` (${s.location_note})` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        <div className="mt-2 border-b border-rule pb-2.5">
          <p className="text-base font-extrabold tracking-tight">Online</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {db.stores.filter((s) => !s.city_id).map((s) => (
              <Badge key={s.id} tone="stone">{s.name}</Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border-2 border-dashed border-rule-2 p-3.5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">Add a city</p>
          <div className="flex gap-2">
            <input value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} placeholder="city name" className={input} />
            <select value={newCity.island_id} onChange={(e) => setNewCity({ ...newCity, island_id: e.target.value })} className={input}>
              <option value="">island…</option>
              {db.islands.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <GhostButton className="w-full" onClick={addCity}>+ Add city</GhostButton>

          <p className="pt-2 font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">Add a store (name + city)</p>
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
        </div>

        <SectionHeader>Data</SectionHeader>
        <div className="space-y-3 pt-1">
          <p className="flex items-center gap-2 text-sm font-bold">
            Mode:{' '}
            {store.mode === 'local' ? (
              <Badge tone="amber">local demo — this device only</Badge>
            ) : (
              <Badge tone="green">Supabase connected</Badge>
            )}
          </p>
          <p className="font-mono text-[11px] font-medium leading-4 text-ink-soft">
            To go live: create a Supabase project, run supabase/schema.sql, then set VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY in .env.local. Every household device signs into the one shared account
            (v1 — see DECISIONS.md).
          </p>
          <GhostButton className="w-full" onClick={reset}>↺ Reset demo data</GhostButton>
          {isAuthCapable(store) && (
            <GhostButton className="w-full" onClick={() => isAuthCapable(store) && store.signOut()}>
              Sign out of this device
            </GhostButton>
          )}
        </div>
      </div>
    </div>
  )
}
