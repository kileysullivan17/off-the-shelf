import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { isAuthCapable } from '../lib/store/DataStore'
import { Card, PrimaryButton } from './ui'

/**
 * In Supabase mode, gate the whole app behind the shared-household sign-in
 * (D19). In local demo mode there's no auth surface, so children render as-is.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const store = useStore()
  const auth = isAuthCapable(store) ? store : null
  const [ready, setReady] = useState(!auth)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!auth) return
    let alive = true
    auth.hasSession().then((v) => {
      if (!alive) return
      setSignedIn(v)
      setReady(true)
    })
    const unsub = auth.onAuthChange((v) => setSignedIn(v))
    return () => {
      alive = false
      unsub()
    }
  }, [auth])

  if (!auth) return <>{children}</>
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center font-mono text-[12px] font-bold uppercase tracking-[.1em] text-ink-mute">
        Connecting…
      </div>
    )
  }
  // Flip the gate the moment sign-in succeeds rather than depending solely on
  // the onAuthChange event, which can be swallowed if the auth lock stalls.
  const handleSignIn = async (email: string, password: string) => {
    const err = await auth.signIn(email, password)
    if (!err) setSignedIn(true)
    return err
  }
  if (!signedIn) return <LoginScreen onSignIn={handleSignIn} />
  return <>{children}</>
}

function LoginScreen({ onSignIn }: { onSignIn: (e: string, p: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await onSignIn(email.trim(), password)
    if (err) {
      setError(err)
      setBusy(false)
    }
    // on success, onAuthChange flips the gate — no further work here
  }

  const input = 'w-full rounded-[10px] border-2 border-ink bg-paper px-3.5 py-3 text-base font-bold placeholder:font-semibold placeholder:text-ink-mute'

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight">Island Shopping</h1>
          <p className="mt-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-soft">
            Sign in to the household account
          </p>
        </div>
        <form onSubmit={submit}>
          <Card className="space-y-3 p-4">
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="household email"
              className={input}
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className={input}
            />
            {error && (
              <p className="font-mono text-[11px] font-bold uppercase tracking-[.04em] text-danger">{error}</p>
            )}
            <PrimaryButton type="submit" className="w-full" disabled={busy || !email || !password}>
              {busy ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>
          </Card>
        </form>
        <p className="mt-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[.04em] leading-4 text-ink-mute">
          One shared login for everyone in the household
        </p>
      </div>
    </div>
  )
}
