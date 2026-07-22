import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useDB } from './lib/store'
import { PlanRun } from './screens/PlanRun'
import { TripMode } from './screens/TripMode'
import { AddItem } from './screens/AddItem'
import { Staples } from './screens/Staples'
import { History } from './screens/History'
import { Inbox } from './screens/Inbox'
import { PasteImport } from './screens/PasteImport'
import { Settings } from './screens/Settings'
import {
  ChevronIcon, ClockIcon, DotsIcon, PlusIcon, RouteIcon, StaplesIcon,
} from './components/icons'

const tabs = [
  { to: '/', label: 'Runs', icon: RouteIcon },
  { to: '/add', label: 'Add', icon: PlusIcon },
  { to: '/staples', label: 'Staples', icon: StaplesIcon },
  { to: '/history', label: 'Memory', icon: ClockIcon },
  { to: '/more', label: 'More', icon: DotsIcon },
]

function TabBar({ attention }: { attention: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule-2 bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md px-2 pt-1.5 pb-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-1 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[.08em] ${
                isActive ? 'text-ink' : 'text-ink-mute'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <t.icon size={20} />
                <span className={isActive ? 'border-b-2 border-ink pb-0.5' : 'pb-[3px]'}>{t.label}</span>
                {t.label === 'More' && attention && (
                  <span className="absolute right-1/2 top-0 mr-[-18px] h-2 w-2 rounded-full bg-magenta" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function More() {
  const { data: db } = useDB()
  const openQuestions = db?.questions.filter((q) => q.status === 'open').length ?? 0
  const pendingReturns = db?.returns.filter((r) => r.status === 'pending').length ?? 0
  const links = [
    { to: '/inbox', label: 'Questions & returns', badge: openQuestions + pendingReturns },
    { to: '/import', label: 'Paste import', badge: 0 },
    { to: '/settings', label: 'Settings', badge: 0 },
  ]
  return (
    <div>
      <div className="bg-hero px-4 pb-3.5 pt-4 text-paper">
        <h1 className="text-[28px] font-extrabold leading-8 tracking-tight">More</h1>
      </div>
      <div className="px-4">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex min-h-[56px] items-center gap-3 border-b border-rule py-3"
          >
            <span className="flex-1 text-base font-bold tracking-tight">{l.label}</span>
            {l.badge > 0 && (
              <span className="rounded-full bg-magenta-tint border border-magenta-border px-2 py-0.5 font-mono text-[11px] font-bold text-magenta-ink">
                {l.badge}
              </span>
            )}
            <ChevronIcon size={16} className="text-ink-mute" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { data: db } = useDB()
  const attention =
    (db?.questions.some((q) => q.status === 'open') || db?.returns.some((r) => r.status === 'pending')) ?? false
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <Routes>
        <Route path="/" element={<PlanRun />} />
        <Route path="/trip/:tripId" element={<TripMode />} />
        <Route path="/add" element={<AddItem />} />
        <Route path="/staples" element={<Staples />} />
        <Route path="/history" element={<History />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/import" element={<PasteImport />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<More />} />
      </Routes>
      <TabBar attention={attention} />
    </div>
  )
}
