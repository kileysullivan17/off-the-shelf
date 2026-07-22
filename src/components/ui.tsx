import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm border border-stone-200 ${className}`}>
      {children}
    </div>
  )
}

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-2 px-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{children}</h2>
      {action}
    </div>
  )
}

const badgeTones = {
  amber: 'bg-amber-100 text-amber-800',
  teal: 'bg-brand-100 text-brand-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-800',
  stone: 'bg-stone-200 text-stone-600',
  green: 'bg-emerald-100 text-emerald-800',
} as const

export function Badge({ tone = 'stone', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  )
}

export function PrimaryButton({
  children, onClick, disabled, className = '', type = 'button',
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-brand-700 text-white font-semibold px-4 py-3 active:bg-brand-800 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children, onClick, className = '',
}: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 active:bg-stone-100 ${className}`}
    >
      {children}
    </button>
  )
}

/** Bottom action sheet — the one-handed menu for item actions. */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        {title && <h3 className="mb-3 text-base font-semibold">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5 text-xl leading-none">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={n <= (value ?? 0) ? 'text-amber-500' : 'text-stone-300'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

/** Downscale to ~700px JPEG data URL so photos fit localStorage (D13). */
export async function fileToDataUrl(file: File, maxDim = 700): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

export function PhotoInput({
  label = '📷 Attach photo', onPhoto,
}: { label?: string; onPhoto: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setBusy(true)
          try {
            onPhoto(await fileToDataUrl(file))
          } finally {
            setBusy(false)
            e.target.value = ''
          }
        }}
      />
      <GhostButton onClick={() => ref.current?.click()}>{busy ? 'Loading…' : label}</GhostButton>
    </>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-stone-500">{children}</p>
}

/** Auto-dismissing confirmation blip. */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 1800)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className="fixed bottom-24 inset-x-0 z-50 flex justify-center pointer-events-none">
      <div className="rounded-full bg-stone-900/90 text-white text-sm px-4 py-2">{msg}</div>
    </div>
  ) : null
  return [node, setMsg]
}
