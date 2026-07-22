import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useDB, useMutate } from '../lib/store'
import { storeLabel } from '../lib/tripLogic'
import { norm, uid } from '../lib/types'
import { Card, PhotoInput, PrimaryButton, useToast } from '../components/ui'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  store_name: z.string().trim().min(1, 'Pick a store'),
  pinned_store_id: z.string(), // '' = flexible (D3)
  member_id: z.string(),
  category: z.string(),
  quantity_note: z.string(),
  heat_safe: z.boolean(),
  staple: z.boolean(),
  instruction_note: z.string(),
  photo_requested: z.boolean(),
  aisle: z.string(), // only meaningful when pinned (D15)
})

type FormValues = z.infer<typeof schema>

const CATEGORIES = ['grocery', 'dairy', 'frozen', 'pantry', 'household', 'hardware', 'clothes', 'kids', 'baby', 'personal', 'pharmacy', 'auto', 'electronics']

export function AddItem() {
  const { data: db } = useDB()
  const mutate = useMutate()
  const [toast, showToast] = useToast()
  const [photo, setPhoto] = useState<string | null>(null)

  const {
    register, handleSubmit, watch, reset, getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', store_name: '', pinned_store_id: '', member_id: '',
      category: '', quantity_note: '', heat_safe: false, staple: false,
      instruction_note: '', photo_requested: false, aisle: '',
    },
  })

  if (!db) return null

  const chainNames = [...new Set(db.stores.map((s) => s.name))]
  const watchedStore = watch('store_name')
  const pinnedId = watch('pinned_store_id')
  const locations = db.stores.filter((s) => norm(s.name) === norm(watchedStore || ''))

  const onSubmit = handleSubmit((v) => {
    mutate.mutate(async (s) => {
      await s.upsertItem({
        id: uid(),
        name: v.name,
        store_name: v.store_name,
        pinned_store_id: v.pinned_store_id || null,
        category: v.category || null,
        quantity_note: v.quantity_note || null,
        heat_safe: v.heat_safe,
        member_id: v.member_id || null,
        staple: v.staple,
        photo,
        instruction_note: v.instruction_note || null,
        photo_requested: v.photo_requested,
        status: 'needed',
        added_at: new Date().toISOString(),
      })
      if (v.pinned_store_id && v.aisle.trim()) {
        await s.setAisle({
          id: uid(), store_id: v.pinned_store_id, item_name: norm(v.name),
          code: v.aisle.trim().toUpperCase(), confirmed_at: new Date().toISOString(),
        })
      }
    })
    showToast(`${v.name} added ✓`)
    // fast capture: keep store/member sticky, clear the rest
    const keep = getValues()
    reset({
      ...keep, name: '', quantity_note: '', instruction_note: '',
      aisle: '', photo_requested: false, staple: false, heat_safe: false, category: '',
    })
    setPhoto(null)
  })

  const input = 'w-full rounded-xl border border-stone-300 px-3 py-3 bg-white'
  const label = 'mb-1 block text-sm font-medium text-stone-600'

  return (
    <div className="p-4">
      {toast}
      <h1 className="mb-4 text-2xl font-bold">Add item</h1>
      <form onSubmit={onSubmit}>
        <Card className="space-y-4 p-4">
          <div>
            <label className={label}>Item *</label>
            <input {...register('name')} placeholder="e.g. Oat milk" className={input} autoFocus />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className={label}>Store *</label>
            <input {...register('store_name')} list="chains" placeholder="Target, KTA, Amazon…" className={input} />
            <datalist id="chains">
              {chainNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            {errors.store_name && <p className="mt-1 text-sm text-red-600">{errors.store_name.message}</p>}
          </div>

          {locations.length > 0 && (
            <div>
              <label className={label}>Location — any works unless pinned (default: flexible)</label>
              <select {...register('pinned_store_id')} className={input}>
                <option value="">Flexible — any {watchedStore} location</option>
                {locations.map((s) => (
                  <option key={s.id} value={s.id}>Pin to {storeLabel(db, s)}</option>
                ))}
              </select>
            </div>
          )}

          {pinnedId && (
            <div>
              <label className={label}>Aisle at that location (optional)</label>
              <input {...register('aisle')} placeholder="e.g. G37" autoCapitalize="characters" className={input} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>For member</label>
              <select {...register('member_id')} className={input}>
                <option value="">Everyone</option>
                {db.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select {...register('category')} className={input}>
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Quantity note</label>
            <input {...register('quantity_note')} placeholder="x 2, big pack…" className={input} />
          </div>

          <div>
            <label className={label}>Shopper instructions</label>
            <input
              {...register('instruction_note')}
              placeholder='brand, “only if not expensive”, “check expiration”…'
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium text-stone-700">
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-3">
              <input type="checkbox" {...register('heat_safe')} className="h-5 w-5 accent-teal-700" />
              ☀️ Heat-safe (survives the drive)
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-3">
              <input type="checkbox" {...register('staple')} className="h-5 w-5 accent-teal-700" />
              🔁 Staple
            </label>
            <label className="col-span-2 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-3">
              <input type="checkbox" {...register('photo_requested')} className="h-5 w-5 accent-teal-700" />
              📷 Ask shopper for a photo before buying
            </label>
          </div>

          <div className="flex items-center gap-3">
            <PhotoInput label={photo ? '📷 Replace photo' : '📷 Photo (optional)'} onPhoto={setPhoto} />
            {photo && <img src={photo} alt="item" className="h-12 w-12 rounded-lg object-cover" />}
          </div>

          <PrimaryButton type="submit" className="w-full" disabled={mutate.isPending}>
            Add to list
          </PrimaryButton>
        </Card>
      </form>
    </div>
  )
}
