// Inline stroke icons from the delivered design reference — sized via props,
// colored via currentColor so the status inks flow through CSS.

function Svg({
  d, size = 14, strokeWidth = 2.4, className = '',
}: { d: string; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

export const BasketIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} d="M4.5 9.5h15l-1.7 8.6a2 2 0 0 1-2 1.6H8.2a2 2 0 0 1-2-1.6L4.5 9.5zM8.5 9.5L12 4l3.5 5.5" />
)
export const CheckIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={3.4} d="M4.5 12.6l4.6 4.6L19.5 6.8" />
)
export const XIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={3.2} d="M6 6l12 12M18 6L6 18" />
)
export const SwapIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={2.6} d="M4 9h12l-3-3M20 15H8l3 3" />
)
export const ArrowIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={2.8} d="M4 12h13M12 6.5l5.5 5.5L12 17.5" />
)
export const PauseIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={3} d="M9.2 7v10M14.8 7v10" />
)
export const CameraIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className={`shrink-0 ${p.className ?? ''}`} aria-hidden>
    <path d="M4.5 8.2h3l1.9-2.7h5.2l1.9 2.7h3a1 1 0 0 1 1 1v9.3a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
)
export const SunIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className={`shrink-0 ${p.className ?? ''}`} aria-hidden>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
  </svg>
)
export const PlusIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={2.8} d="M12 5v14M5 12h14" />
)
export const ChevronIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} d="M9.5 5.5L16 12l-6.5 6.5" />
)
export const BackIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} strokeWidth={2.6} d="M14.5 5.5L8 12l6.5 6.5" />
)
export const SearchIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" className={`shrink-0 ${p.className ?? ''}`} aria-hidden>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M15.8 15.8L21 21" />
  </svg>
)
export const RouteIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${p.className ?? ''}`} aria-hidden>
    <path d="M4 18c0-6 4-6 8-6s8 0 8-6" />
    <circle cx="4" cy="18" r="2.2" />
    <circle cx="20" cy="6" r="2.2" />
  </svg>
)
export const StaplesIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} size={p.size ?? 20} strokeWidth={2.3} d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" />
)
export const DotsIcon = (p: { size?: number; className?: string }) => (
  <Svg {...p} size={p.size ?? 20} strokeWidth={2.6} d="M5 12h.01M12 12h.01M19 12h.01" />
)
export const ClockIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className={`shrink-0 ${p.className ?? ''}`} aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
