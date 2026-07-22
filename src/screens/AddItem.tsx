import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useDB, useMutate } from '../lib/store'
import { storeLabel } from '../lib/tripLogic'
import { norm, uid } from '../lib/types'
import { PhotoInput, PrimaryButton, useToast } from '../components/ui'

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

  const input = 'w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 text-base font-bold placeholder:font-semibold placeholder:text-ink-mute'
  const label = 'mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft'
  const check = 'flex min-h-[48px] items-center gap-2.5 rounded-xl border-[1.5px] border-rule-2 px-3 py-3 text-sm font-bold'

  return (
    <div>
      {toast}
      <div className="border-b border-rule px-4 pb-3.5 pt-4">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">Add item</h1>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-soft">
          Name first — everything else optional
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
        <div>
          <label className={label}>Item *</label>
          <input {...register('name')} placeholder="e.g. Oat milk" className={`${input} text-xl`} autoFocus />
          {errors.name && <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[.04em] text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label className={label}>Store *</label>
          <input {...register('store_name')} list="chains" placeholder="Target, KTA, Amazon…" className={input} />
          <datalist id="chains">
            {chainNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          {errors.store_name && <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[.04em] text-danger">{errors.store_name.message}</p>}
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <span className="h-px flex-1 bg-rule-2" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-ink-soft">Everything below is optional</span>
          <span className="h-px flex-1 bg-rule-2" />
        </div>

        {locations.length > 0 && (
          <div>
            <label className={label}>Location — any works unless pinned</label>
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
            <label className={label}>Aisle at that location</label>
            <input {...register('aisle')} placeholder="e.g. G37" autoCapitalize="characters" className={`${input} font-mono`} />
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

        <div className="grid grid-cols-2 gap-2">
          <label className={check}>
            <input type="checkbox" {...register('heat_safe')} className="h-5 w-5 accent-violet" />
            Heat-safe (survives the drive)
          </label>
          <label className={check}>
            <input type="checkbox" {...register('staple')} className="h-5 w-5 accent-violet" />
            Staple
          </label>
          <label className={`${check} col-span-2`}>
            <input type="checkbox" {...register('photo_requested')} className="h-5 w-5 accent-violet" />
            Ask shopper for a photo before buying
          </label>
        </div>

        <div className="flex items-center gap-3">
          <PhotoInput label={photo ? 'Replace photo' : 'Photo (optional)'} onPhoto={setPhoto} />
          {photo && <img src={photo} alt="item" className="h-12 w-12 rounded-lg object-cover" />}
        </div>

        <PrimaryButton type="submit" className="w-full" disabled={mutate.isPending}>
          Save — done
        </PrimaryButton>
      </form>
    </div>
  )
}
