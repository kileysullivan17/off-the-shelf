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
import { Card } from './components/ui'

const tabs = [
  { to: '/', label: 'Plan', icon: '🗺️' },
  { to: '/add', label: 'Add', icon: '➕' },
  { to: '/staples', label: 'Staples', icon: '🔁' },
  { to: '/history', label: 'History', icon: '🧠' },
  { to: '/more', label: 'More', icon: '⋯' },
]

function TabBar({ attention }: { attention: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-brand-700' : 'text-stone-500'
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
            {t.label === 'More' && attention && (
              <span className="absolute right-1/2 top-1 mr-[-18px] h-2 w-2 rounded-full bg-red-500" />
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
    { to: '/inbox', label: 'Questions & returns', icon: '💬', badge: openQuestions + pendingReturns },
    { to: '/import', label: 'Paste import', icon: '📋', badge: 0 },
    { to: '/settings', label: 'Settings', icon: '⚙️', badge: 0 },
  ]
  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">More</h1>
      <Card>
        {links.map((l, i) => (
          <Link
            key={l.to}
            to={l.to}
            className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-stone-100' : ''}`}
          >
            <span className="text-xl">{l.icon}</span>
            <span className="flex-1 font-medium">{l.label}</span>
            {l.badge > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {l.badge}
              </span>
            )}
            <span className="text-stone-400">›</span>
          </Link>
        ))}
      </Card>
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
