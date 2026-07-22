import { useEffect, useRef, useState, type ReactNode } from 'react'

/* Shared design-system primitives — cool-violet skin of the delivered
 * reference (design/design/design-reference.html). Ink on paper, hairline
 * rules, mono chips; flat color everywhere except the hero surfaces. */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-rule-2 ${className}`}>
      {children}
    </div>
  )
}

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between rounded-md bg-tint px-3 py-1.5">
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-[.1em] text-ink">{children}</h2>
      {action}
    </div>
  )
}

const badgeTones = {
  amber: 'bg-amber-tint text-amber border-amber-border',
  violet: 'bg-violet-tint text-violet-deep border-violet-border',
  magenta: 'bg-magenta-tint text-magenta-ink border-magenta-border',
  red: 'bg-danger-tint text-danger border-danger-border',
  teal: 'bg-sub-tint text-sub border-sub-border',
  blue: 'bg-moved-tint text-moved border-moved-border',
  stone: 'bg-parked-tint text-parked border-rule-2',
  green: 'bg-bought-tint text-bought border-bought-border',
  member: 'bg-transparent text-ink border-ink', // member tag — text, never color
} as const

export function Badge({ tone = 'stone', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.04em] ${badgeTones[tone]}`}
    >
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
      className={`bg-hero inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-[13px] font-extrabold uppercase tracking-[.08em] text-paper active:opacity-85 disabled:opacity-40 ${className}`}
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
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-ink bg-transparent px-3 py-2 font-mono text-[12px] font-extrabold uppercase tracking-[.06em] text-ink active:bg-tint ${className}`}
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
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(20,24,27,.24)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule-2" />
        {title && <h3 className="mb-3 border-b border-rule pb-2 text-xl font-extrabold tracking-tight">{title}</h3>}
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
          className={n <= (value ?? 0) ? 'text-violet-deep' : 'text-rule-2'}
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
  label = 'Attach photo', onPhoto,
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
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="h-12 w-12 rounded-xl border-[3px] border-dashed border-rule-2" />
      <p className="mt-4 max-w-[260px] text-sm font-semibold text-ink-soft">{children}</p>
    </div>
  )
}

/** Auto-dismissing confirmation blip — the ink pill at the thumb. */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 1800)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
      <div className="rounded-full bg-ink px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[.06em] text-paper shadow-lg">
        {msg}
      </div>
    </div>
  ) : null
  return [node, setMsg]
}
