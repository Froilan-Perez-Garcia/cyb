import { lazy } from 'react'
import { MotionConfig } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './app/auth'
import { ThemeProvider } from './app/theme'
import { useAuth } from './app/useAuth'
import { Layout } from './components/Layout'
import { PageSkeleton } from './components/Skeleton'
import { MfaChallenge } from './features/settings/MfaChallenge'
import { MfaSetup } from './features/settings/MfaSetup'
import { useMfaGate } from './features/settings/mfa'
import { isConfigured } from './lib/supabase'

const FlujoPage = lazy(() => import('./features/transactions/FlujoPage'))
const DeudasPage = lazy(() => import('./features/debts/DeudasPage'))
const AjustesPage = lazy(() => import('./features/settings/AjustesPage'))
const LoginPage = lazy(() => import('./features/settings/LoginPage'))

const queryClient = new QueryClient()

function Protected() {
  const { session, loading } = useAuth()
  const mfa = useMfaGate(session)
  if (loading || mfa.loading)
    return (
      <div className="p-8">
        <PageSkeleton />
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  if (mfa.setup) return <MfaSetup onDone={mfa.clear} />
  if (mfa.required) return <MfaChallenge onVerified={mfa.clear} />
  return <Layout />
}

function Public() {
  const { session, loading } = useAuth()
  if (loading)
    return (
      <div className="p-8">
        <PageSkeleton />
      </div>
    )
  return session ? <Navigate to="/flujo" replace /> : <LoginPage />
}

function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="max-w-md rounded-2xl border border-border bg-surface p-6 text-sm">
        Faltan las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        Copia <code>.env.example</code> a <code>.env</code> y complétalas.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        {isConfigured ? (
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <HashRouter>
                <Routes>
                  <Route path="/login" element={<Public />} />
                  <Route element={<Protected />}>
                    <Route index element={<Navigate to="/flujo" replace />} />
                    <Route path="/flujo" element={<FlujoPage />} />
                    <Route path="/deudas" element={<DeudasPage />} />
                    <Route path="/movimientos" element={<Navigate to="/flujo" replace />} />
                    <Route path="/bills" element={<Navigate to="/deudas" replace />} />
                    <Route path="/plan" element={<Navigate to="/deudas" replace />} />
                    <Route path="/asesor" element={<Navigate to="/deudas" replace />} />
                    <Route path="/ajustes" element={<AjustesPage />} />
                  </Route>
                </Routes>
              </HashRouter>
            </AuthProvider>
          </QueryClientProvider>
        ) : (
          <MissingConfig />
        )}
      </MotionConfig>
    </ThemeProvider>
  )
}
